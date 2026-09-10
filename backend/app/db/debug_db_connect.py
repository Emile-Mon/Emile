import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append("backend")
from app.db.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
        print("AsyncSessionLocal COUNT FROM tokens:", res.scalar())

        res_p = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'passed';"))
        print("AsyncSessionLocal COUNT PASSED:", res_p.scalar())

        res_s = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'stalled';"))
        print("AsyncSessionLocal COUNT STALLED:", res_s.scalar())

if __name__ == "__main__":
    asyncio.run(check())
