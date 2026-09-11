import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def set_jar_80():
    async with AsyncSessionLocal() as db:
        await db.execute(text("UPDATE model_runs SET jar_level = 0.80;"))
        await db.commit()
        print("[JAR UPDATE] Set model_runs jar_level to 0.80 (80%) in PostgreSQL database!")

if __name__ == "__main__":
    asyncio.run(set_jar_80())
