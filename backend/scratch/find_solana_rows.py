import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def find_rows():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT mint, name, chain, first_seen_at, last_polled_at FROM tokens WHERE name LIKE '%Solana%' ORDER BY first_seen_at DESC LIMIT 20;"))
        rows = res.fetchall()
        print("TOTAL MATCHED SOLANA ROWS:", len(rows))
        for r in rows:
            print(r)

if __name__ == "__main__":
    asyncio.run(find_rows())
