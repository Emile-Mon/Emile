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
        # Check if launch already exists
        stmt = select(Launch).order_by(desc(Launch.day_index)).limit(1)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            print(f"[SEED LAUNCHES] Launch #{existing.day_index} already exists in database.")
            await engine.dispose()
            return

        # Fetch latest cycle and candidate
        stmt_cycle = select(IdeaCycle).order_by(desc(IdeaCycle.cycle_id)).limit(1)
        res_cycle = await db.execute(stmt_cycle)
        cycle = res_cycle.scalar_one_or_none()

        if not cycle:
            print("[SEED LAUNCHES] No IdeaCycle found. Run seed_ideas.py first.")
            await engine.dispose()
            return

        cycle_id = cycle.cycle_id
        run_id = cycle.run_id

        stmt_cand = select(IdeaCandidate).where(IdeaCandidate.cycle_id == cycle_id).order_by(IdeaCandidate.rank.asc()).limit(1)
        res_cand = await db.execute(stmt_cand)
        cand = res_cand.scalar_one_or_none()

        cand_id = cand.id if cand else 1
        name = cand.name if cand else "Sherwood Index"
        lore = cand.lore if cand else "Counting what the forest already knew, in public, one row at a time."
        hour = cand.hour if cand else 14

        print(f"[SEED LAUNCHES] Creating Day 007 Launch in 'preparing_launch' status for cycle #{cycle_id}, run #{run_id}...")
        now = datetime.now(timezone.utc)

        contributions = [
            {"feature": "launch_hour_cos", "label": f"Launch hour {hour}:00 UTC", "value": 0.211},
            {"feature": "lore_length", "label": f"Lore length {len(lore)} characters", "value": 0.094},
            {"feature": "name_tokens", "label": f"Name token count {len(name.split())}", "value": 0.038},
            {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
        ]

        launch = Launch(
            day_index=7,
            cycle_id=cycle_id,
            run_id=run_id,
            candidate_id=cand_id,
            name=name,
            symbol="FLTCHR",
            lore=lore,
            launch_hour=hour,
            rank_in_cycle=1,
            predicted_prob=0.8117,
            prediction_sha=hashlib.sha256(name.encode()).hexdigest()[:16],
            prediction_at=now,
            status=LaunchStatus.preparing_launch,
            contributions=contributions
        )

        db.add(launch)
        await db.commit()
        print("[SEED LAUNCHES] Successfully created initial preparing_launch entry in PostgreSQL!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_launches())
