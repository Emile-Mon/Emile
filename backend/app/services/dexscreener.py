import asyncio
import random
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings

class DexScreenerPoller:
    """
    Poller for DexScreener API with batching, exponential backoff, and circuit breaker.
    Maintains accumulation rule: peak_mc = GREATEST(peak_mc, new_mc).
    """
    def __init__(self, base_url: str = settings.DEXSCREENER_API_BASE):
        self.base_url = base_url
        self.consecutive_errors = 0
        self.circuit_open_until: float = 0.0

    async def fetch_batch_prices(self, mint_addresses: list[str]) -> dict[str, dict]:
        """
        Fetches point-in-time market caps, real token names, and symbols for a batch of token mint addresses.
        Returns dict: { mint_address: {"mc": float, "name": str, "symbol": str} }
        """
        if not mint_addresses:
            return {}

        now = asyncio.get_event_loop().time()
        if now < self.circuit_open_until:
            return {}

        chunks = [mint_addresses[i:i + 30] for i in range(0, len(mint_addresses), 30)]
        results: dict[str, dict] = {}

        async with httpx.AsyncClient(timeout=10.0) as client:
            for chunk in chunks:
                mints_str = ",".join(chunk)
                url = f"{self.base_url}/tokens/{mints_str}"

                retries = 0
                max_retries = 3
                success = False

                while retries <= max_retries and not success:
                    try:
                        res = await client.get(url)
                        if res.status_code == 200:
                            data = res.json()
                            pairs = data.get("pairs") or []
                            for pair in pairs:
                                base_token = pair.get("baseToken") or {}
                                mint = base_token.get("address")
                                fdv = float(pair.get("fdv") or pair.get("marketCap") or 0.0)
                                real_name = base_token.get("name")
                                real_sym = base_token.get("symbol")

                                if mint and fdv > 0:
                                    prev_mc = results.get(mint, {}).get("mc", 0.0)
                                    results[mint] = {
                                        "mc": max(prev_mc, fdv),
                                        "name": real_name,
                                        "symbol": real_sym
                                    }
                            
                            success = True
                            self.consecutive_errors = 0
                        elif res.status_code in [429, 500, 502, 503, 504]:
                            retries += 1
                            self.consecutive_errors += 1
                            delay = (2 ** retries) + (random.random() * 0.5)
                            await asyncio.sleep(delay)
                        else:
                            break
                    except Exception:
                        retries += 1
                        self.consecutive_errors += 1
                        delay = (2 ** retries) + (random.random() * 0.5)
                        await asyncio.sleep(delay)

                if self.consecutive_errors >= 10:
                    self.circuit_open_until = asyncio.get_event_loop().time() + 60.0

        return results

    async def update_token_peaks(self, db: AsyncSession, prices: dict[str, dict]) -> int:
        """
        Executes GREATEST(peak_mc, new_mc) update query and updates real token name/symbol in database.
        """
        if not prices:
            return 0

        updated_count = 0
        now = datetime.now(timezone.utc)

        for mint, info in prices.items():
            mc = info.get("mc", 0.0)
            real_name = info.get("name")
            real_sym = info.get("symbol")

            query = text("""
                UPDATE tokens 
                SET peak_mc = GREATEST(peak_mc, :mc), 
                    last_seen_mc = :mc, 
                    last_polled_at = :now,
                    poll_count = poll_count + 1,
                    name = CASE 
                        WHEN :real_name IS NOT NULL AND :real_name != '' AND (name LIKE 'Robinhood Token $0X%' OR name LIKE 'Solana%') THEN :real_name 
                        ELSE name 
                    END,
                    symbol = CASE 
                        WHEN :real_sym IS NOT NULL AND :real_sym != '' AND (symbol LIKE '0X%' OR symbol = 'SOL') THEN :real_sym 
                        ELSE symbol 
                    END,
                    status = CASE 
                        WHEN GREATEST(peak_mc, :mc) >= 30000.0 THEN 'passed'::token_status 
                        ELSE status 
                    END,
                    crossed_10k_at = CASE 
                        WHEN tokens.crossed_10k_at IS NULL AND :mc >= 10000.0 THEN :now 
                        ELSE tokens.crossed_10k_at 
                    END
                WHERE mint = :mint;
            """)
            res = await db.execute(query, {
                "mint": mint,
                "mc": mc,
                "now": now,
                "real_name": real_name,
                "real_sym": real_sym
            })
            updated_count += res.rowcount

        await db.commit()
        return updated_count
