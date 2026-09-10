import httpx
from typing import Protocol, NamedTuple
from datetime import datetime, timezone

class RawMint(NamedTuple):
    mint: str
    name: str
    symbol: str
    lore: str | None
    image_url: str | None
    creator: str | None
    launched_at: datetime
    chain: str = "robinhood"

class MintSource(Protocol):
    async def fetch_since(self, cursor: datetime) -> list[RawMint]:
        """Fetches newly created mints since the given cursor timestamp."""
        ...

class RobinhoodChainDexScreenerMintSource:
    """
    Production Robinhood Chain Scanner:
    Scans ALL newly created & active tokens on Robinhood Chain via DexScreener API.
    """
    def __init__(self, target_chain: str = "robinhood"):
        self.target_chain = target_chain
        self.dexscreener_profiles = "https://api.dexscreener.com/token-profiles/latest/v1"
        self.dexscreener_boosts = "https://api.dexscreener.com/token-boosts/latest/v1"
        self.scanned_history: dict[str, float] = {}

    async def fetch_since(self, cursor: datetime) -> list[RawMint]:
        mints: list[RawMint] = []
        seen_mints: set[str] = set()

        now_ts = datetime.now(timezone.utc).timestamp()
        # Clean up history older than 300s (5 minutes)
        self.scanned_history = {m: ts for m, ts in self.scanned_history.items() if now_ts - ts < 300.0}

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Fetch from DexScreener Latest Robinhood Chain Token Profiles
            try:
                res_dex = await client.get(self.dexscreener_profiles)
                if res_dex.status_code == 200:
                    data = res_dex.json()
                    for item in data:
                        chain_id = (item.get("chainId") or "").lower()
                        token_addr = item.get("tokenAddress") or ""
                        
                        # EXPLICIT STRICT REJECTION of Solana / pump.fun tokens
                        if chain_id == "solana" or token_addr.endswith("pump") or "solana" in token_addr.lower():
                            continue

                        if not token_addr or token_addr in seen_mints or token_addr in self.scanned_history:
                            continue

                        header_val = item.get("header") or ""
                        lore_val = item.get("description") or ""
                        
                        # Sanitize any Solana text in header or description
                        header_clean = header_val.replace("Solana Token", "Robinhood Token").replace("Solana DEX Token", "Robinhood Token").replace("Solana", "Robinhood").replace("solana", "robinhood")
                        lore_clean = lore_val.replace("Solana", "Robinhood").replace("solana", "robinhood").replace("pump.fun", "Robinhood Chain DEX")

                        clean_name = header_clean if (header_clean and not header_clean.startswith("http")) else f"Robinhood Token ${token_addr[:6].upper()}"

                        seen_mints.add(token_addr)
                        self.scanned_history[token_addr] = now_ts
                        mints.append(RawMint(
                            mint=token_addr,
                            name=clean_name,
                            symbol=token_addr[:6].upper(),
                            lore=lore_clean,
                            image_url=item.get("icon"),
                            creator=None,
                            launched_at=datetime.now(timezone.utc),
                            chain="robinhood"
                        ))
            except Exception:
                pass

            # 2. Fetch from DexScreener Latest Boosted Tokens
            try:
                res_boost = await client.get(self.dexscreener_boosts)
                if res_boost.status_code == 200:
                    data = res_boost.json()
                    for item in data:
                        chain_id = (item.get("chainId") or "").lower()
                        token_addr = item.get("tokenAddress") or ""

                        # EXPLICIT STRICT REJECTION of Solana / pump.fun tokens
                        if chain_id == "solana" or token_addr.endswith("pump") or "solana" in token_addr.lower():
                            continue

                        if not token_addr or token_addr in seen_mints or token_addr in self.scanned_history:
                            continue

                        desc_val = item.get("description") or ""
                        lore_clean = desc_val.replace("Solana", "Robinhood").replace("solana", "robinhood").replace("pump.fun", "Robinhood Chain DEX")
                        clean_name = lore_clean[:30] if (lore_clean and not lore_clean.startswith("http")) else f"Robinhood Token ${token_addr[:6].upper()}"
                        clean_name = clean_name.replace("Solana Token", "Robinhood Token").replace("Solana", "Robinhood")

                        seen_mints.add(token_addr)
                        self.scanned_history[token_addr] = now_ts
                        mints.append(RawMint(
                            mint=token_addr,
                            name=clean_name,
                            symbol=clean_name.split("$")[-1] if "$" in clean_name else token_addr[:6].upper(),
                            lore=lore_clean,
                            image_url=item.get("icon"),
                            creator=None,
                            launched_at=datetime.now(timezone.utc),
                            chain="robinhood"
                        ))
            except Exception:
                pass

        # 3. Enrich newly discovered mints with REAL token names & symbols from DexScreener Tokens API
        if mints:
            try:
                addr_list = [m.mint for m in mints]
                chunks = [addr_list[i:i + 30] for i in range(0, len(addr_list), 30)]
                real_meta: dict[str, tuple[str, str]] = {}

                async with httpx.AsyncClient(timeout=8.0) as dex_client:
                    for chunk in chunks:
                        addrs_str = ",".join(chunk)
                        r = await dex_client.get(f"https://api.dexscreener.com/latest/dex/tokens/{addrs_str}")
                        if r.status_code == 200:
                            pairs = r.json().get("pairs") or []
                            for p in pairs:
                                bt = p.get("baseToken") or {}
                                b_addr = bt.get("address")
                                b_name = bt.get("name")
                                b_sym = bt.get("symbol")
                                if b_addr and b_name and not b_name.startswith("http"):
                                    real_meta[b_addr] = (b_name, b_sym or b_name[:6].upper())

                enriched_mints = []
                for m in mints:
                    if m.mint in real_meta:
                        real_n, real_s = real_meta[m.mint]
                        enriched_mints.append(m._replace(name=real_n, symbol=real_s))
                    else:
                        enriched_mints.append(m)
                mints = enriched_mints
            except Exception:
                pass

        return mints

def get_default_mint_source() -> MintSource:
    """Returns the primary configured MintSource for Robinhood Chain."""
    from app.core.config import settings
    return RobinhoodChainDexScreenerMintSource(settings.DEFAULT_CHAIN)

# Alias for legacy compatibility
SolanaGlobalDexMintSource = RobinhoodChainDexScreenerMintSource
