import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT mint, name, symbol, chain FROM tokens ORDER BY first_seen_at DESC LIMIT 15;"))
        rows = res.fetchall()
        for r in rows:
            print(r)

if __name__ == "__main__":
    asyncio.run(check())
