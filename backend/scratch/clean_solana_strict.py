import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def strict_clean():
    async with AsyncSessionLocal() as db:
        print("[STRICT CLEAN] Deleting all non-Robinhood & Solana tokens...")
        
        # Delete any tokens that contain 'solana' (case insensitive) or do not start with '0x'
        await db.execute(text("DELETE FROM tokens WHERE name ILIKE '%solana%' OR mint NOT LIKE '0x%' OR chain != 'robinhood';"))
        
        # Ensure remaining tokens are strictly robinhood
        await db.execute(text("UPDATE tokens SET chain = 'robinhood' WHERE chain != 'robinhood';"))
        
        await db.commit()
        
        # Verify count
        res = await db.execute(text("SELECT COUNT(*), COUNT(CASE WHEN name LIKE '%Solana%' THEN 1 END) FROM tokens;"))
        row = res.fetchone()
        print(f"[STRICT CLEAN RESULT] Total Remaining Tokens: {row[0]}, Solana Named Tokens: {row[1]}")

if __name__ == "__main__":
    asyncio.run(strict_clean())
