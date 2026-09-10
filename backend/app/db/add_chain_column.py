import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import AsyncSessionLocal

async def add_chain_column():
    async with AsyncSessionLocal() as db:
        print("[MIGRATE] Adding 'chain' column to PostgreSQL tokens table...")
        await db.execute(text("ALTER TABLE tokens ADD COLUMN IF NOT EXISTS chain VARCHAR DEFAULT 'robinhood';"))
        await db.execute(text("UPDATE tokens SET chain = 'robinhood' WHERE chain = 'arbitrum' OR chain IS NULL;"))
        await db.commit()
        print("[MIGRATE SUCCESS] PostgreSQL tokens table updated with 'chain' column!")

if __name__ == "__main__":
    asyncio.run(add_chain_column())
