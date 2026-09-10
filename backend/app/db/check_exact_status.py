import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.db.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        tot = (await db.execute(text("SELECT COUNT(*) FROM tokens;"))).scalar()
        passed_status = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'passed';"))).scalar()
        stalled_status = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'stalled';"))).scalar()
        peak_ge_30k = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE peak_mc >= 30000;"))).scalar()

        print(f"DB TOTAL: {tot}")
        print(f"DB STATUS='passed': {passed_status}")
        print(f"DB STATUS='stalled': {stalled_status}")
        print(f"DB PEAK_MC >= 30,000: {peak_ge_30k}")

if __name__ == "__main__":
    asyncio.run(check())
