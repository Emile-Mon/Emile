import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def clean_db():
    async with AsyncSessionLocal() as db:
        print("[CLEANER] Removing all old Solana tokens from database...")
        # 1. Delete tokens that have pump or Solana mints/names
        await db.execute(text("DELETE FROM tokens WHERE mint LIKE '%pump%' OR name LIKE '%Solana%' OR chain != 'robinhood';"))
        
        # 2. Ensure remaining tokens have chain = 'robinhood' and clean names
        await db.execute(text("UPDATE tokens SET chain = 'robinhood' WHERE chain != 'robinhood' OR chain IS NULL;"))
        await db.execute(text("UPDATE tokens SET name = REPLACE(name, 'Solana', 'Robinhood') WHERE name LIKE '%Solana%';"))
        
        await db.commit()
        
        # 3. Check remaining count
        res = await db.execute(text("SELECT COUNT(*), COUNT(CASE WHEN chain='robinhood' THEN 1 END) FROM tokens;"))
        row = res.fetchone()
        print(f"[CLEANER SUCCESS] Total Tokens in DB: {row[0]}, Robinhood Tokens: {row[1]}")

if __name__ == "__main__":
    asyncio.run(clean_db())
