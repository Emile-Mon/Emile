import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
import hashlib
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, desc
from app.core.config import settings
from app.db.models import Launch, LaunchStatus, IdeaCycle, IdeaCandidate, ModelRun

async def seed_launches():
    print("[SEED LAUNCHES] Connecting to PostgreSQL database...")
    engine = create_async_engine(settings.DATABASE_URL_ASYNC, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Fetch latest cycle and candidate
        stmt_cycle = select(IdeaCycle).order_by(desc(IdeaCycle.cycle_id)).limit(1)
        res_cycle = await db.execute(stmt_cycle)
        cycle = res_cycle.scalar_one_or_none()

        cycle_id = cycle.cycle_id if cycle else 1418
        run_id = cycle.run_id if cycle else 444

        now = datetime.now(timezone.utc)

        # 1. Check if launch 1 (14:00 UTC) exists
        stmt1 = select(Launch).where(Launch.launch_hour == 14).limit(1)
        res1 = await db.execute(stmt1)
        launch1 = res1.scalar_one_or_none()

        if not launch1:
            print(f"[SEED LAUNCHES] Creating Day 007 Launch 1 (14:00 UTC) in 'preparing_launch' status...")
            l1 = Launch(
                day_index=7,
                cycle_id=cycle_id,
                run_id=run_id,
                candidate_id=1,
                name="EMILES BANANA",
                symbol="BANANA",
                lore="He was asked to find patterns. So he started looking everywhere...\n\nAnd then, somewhere between all the data... Émile found a banana.",
                launch_hour=14,
                rank_in_cycle=1,
                predicted_prob=0.8117,
                prediction_sha="0x3c51485b11d52f90c251e74875a8b93c81027274",
                prediction_at=now,
                status=LaunchStatus.preparing_launch,
                contributions=[
                    {"feature": "launch_hour_cos", "label": "Launch hour 14:00 UTC", "value": 0.211},
                    {"feature": "lore_length", "label": "Lore length 340 characters", "value": 0.094},
                    {"feature": "name_tokens", "label": "Name token count 3", "value": 0.038},
                    {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
                ]
            )
            db.add(l1)

        # 2. Check if launch 2 (20:00 UTC - twenty hundred Zulu) exists
        stmt2 = select(Launch).where(Launch.launch_hour == 20).limit(1)
        res2 = await db.execute(stmt2)
        launch2 = res2.scalar_one_or_none()

        if not launch2:
            print(f"[SEED LAUNCHES] Creating Day 007 Launch 2 (20:00 UTC - twenty hundred Zulu)...")
            zulu_lore = """In aviation, maritime, and military convention, Coordinated Universal Time is spoken as Zulu, and 20:00 is read as twenty hundred. So 2000Z is said aloud exactly as it is written here: twenty hundred Zulu.

This is the correct radio reading, not a stylisation, which is the point. The name is a coordinate spoken the way operators speak it, by people whose job depends on everyone meaning the same instant."""
            l2 = Launch(
                day_index=8,
                cycle_id=cycle_id,
                run_id=run_id,
                candidate_id=2,
                name="twenty hundred Zulu",
                symbol="2000Z",
                lore=zulu_lore,
                launch_hour=20,
                rank_in_cycle=1,
                predicted_prob=0.8420,
                prediction_sha="0xa8c561693ca146fa515cff72c73ac2c463c956dc",
                mint="0xa8c561693ca146fa515cff72c73ac2c463c956dc",
                prediction_at=now,
                status=LaunchStatus.preparing_launch,
                contributions=[
                    {"feature": "launch_hour_cos", "label": "Launch hour 20:00 UTC", "value": 0.245},
                    {"feature": "lore_length", "label": f"Lore length {len(zulu_lore)} characters", "value": 0.088},
                    {"feature": "name_tokens", "label": "Name token count 3", "value": 0.035},
                    {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
                ]
            )
            db.add(l2)

        await db.commit()
        print("[SEED LAUNCHES] Successfully seeded launch entries in PostgreSQL!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_launches())
