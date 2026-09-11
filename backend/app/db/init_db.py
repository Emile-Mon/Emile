import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.models import Base

async def init_database():
    print(f"Connecting to database: {settings.DATABASE_URL_ASYNC}")
    engine = create_async_engine(settings.DATABASE_URL_ASYNC, echo=True)
    async with engine.begin() as conn:
        print("Creating all tables in PostgreSQL database...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_database())
