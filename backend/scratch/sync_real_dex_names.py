import asyncio
import httpx
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def sync_real_token_names():
    async with AsyncSessionLocal() as db:
        print("[SYNC NAMES] Querying all tokens in PostgreSQL database...")
        res = await db.execute(text("SELECT mint, name, symbol, lore FROM tokens ORDER BY first_seen_at DESC;"))
        rows = res.mappings().all()
        print(f"[SYNC NAMES] Found {len(rows)} tokens in database.")

        mint_map = {r["mint"]: r for r in rows}
        mints = list(mint_map.keys())

        # Chunk into batches of 30 for DexScreener Tokens API
        chunks = [mints[i:i + 30] for i in range(0, len(mints), 30)]
        updated_cnt = 0

        async with httpx.AsyncClient(timeout=10.0) as client:
            for chunk in chunks:
                mints_str = ",".join(chunk)
                url = f"https://api.dexscreener.com/latest/dex/tokens/{mints_str}"
                try:
                    r = await client.get(url)
                    if r.status_code == 200:
                        data = r.json()
                        pairs = data.get("pairs") or []
                        for pair in pairs:
                            bt = pair.get("baseToken") or {}
                            mint_addr = bt.get("address")
                            real_name = bt.get("name")
                            real_sym = bt.get("symbol")

                            if mint_addr and real_name and not real_name.startswith("http"):
                                update_query = text("""
                                    UPDATE tokens
                                    SET name = :real_name,
                                        symbol = :real_sym
                                    WHERE mint = :mint;
                                """)
                                await db.execute(update_query, {
                                    "mint": mint_addr,
                                    "real_name": real_name,
                                    "real_sym": real_sym or real_name[:6].upper()
                                })
                                updated_cnt += 1
                except Exception as e:
                    print(f"[SYNC NAMES WARNING] Batch fetch failed: {e}")

        # Also cleanup any remaining generic "Robinhood Token $0X..." names using lore descriptions
        cleanup_query = text("""
            UPDATE tokens
            SET name = CASE
                WHEN lore IS NOT NULL AND LENGTH(lore) > 3 AND lore NOT LIKE 'http%' THEN 
                    INITCAP(SUBSTRING(lore FROM '^([^.\n]+)'))
                ELSE name
            END
            WHERE name LIKE 'Robinhood Token $0X%' OR name LIKE 'Solana%';
        """)
        await db.execute(cleanup_query)

        # Ensure symbols are clean
        symbol_cleanup = text("""
            UPDATE tokens
            SET symbol = CASE
                WHEN symbol LIKE '0X%' OR symbol = 'SOL' THEN UPPER(SUBSTRING(name FROM 1 FOR 6))
                ELSE symbol
            END;
        """)
        await db.execute(symbol_cleanup)

        await db.commit()
        print(f"[SYNC NAMES SUCCESS] Updated {updated_cnt} tokens with real DexScreener names & symbols!")

        # Verify DB output
        check_res = await db.execute(text("SELECT name, symbol FROM tokens LIMIT 10;"))
        print("[SYNC NAMES DB SAMPLE]:", check_res.fetchall())

if __name__ == "__main__":
    asyncio.run(sync_real_token_names())
