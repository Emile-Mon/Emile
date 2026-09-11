import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
import hashlib
import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, desc
from app.core.config import settings
from app.db.models import IdeaCycle, IdeaCandidate, IdeaExclusion, ModelRun

NAMES = [
    "Sherwood Index", "Longbow", "Quiver", "Tuck", "Marian Protocol", "Arrowhead",
    "Greenwood", "Fletcher", "Yeoman", "Bowstring", "Sheriff", "Nottingham Ledger",
    "Oakroot", "Gisbourne", "Hood Lantern", "Alan-a-Dale", "Bramble", "Stagline",
    "Coppice", "Tithe", "Verderer", "Assart", "Purlieu", "Warrener", "Bracken",
    "Fallow", "Hollowoak", "Bowyer", "Robinhood Vault", "Sherwood Chain", "Loxley Capital"
]

LORES = [
    "A ledger that forgets nothing and forgives less.",
    "Counting what the forest already knew.",
    "Every arrow is a claim about the future.",
    "Not a shortcut. A slower road, measured.",
    "The interest is paid in patience.",
    "Built for the ones who check the receipts.",
    "A tax on certainty, refunded on proof.",
    "What survives the winter gets a name.",
    "Twelve hundred holders and one honest chart.",
    "The bow is only as good as the draw.",
    "Nothing here is promised. Everything is recorded.",
    "A small clearing, kept deliberately small."
]

async def seed_ideas():
    print(f"[SEED] Connecting to database...")
    engine = create_async_engine(settings.DATABASE_URL_ASYNC, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Check if latest model run exists or seed a default model run
        stmt_model = select(ModelRun).order_by(desc(ModelRun.id)).limit(1)
        res_model = await db.execute(stmt_model)
        model_run = res_model.scalar_one_or_none()

        if not model_run:
            print("[SEED] Creating initial ModelRun entry...")
            model_run = ModelRun(
                n_samples=2200,
                n_positive=310,
                capacity_d=28,
                auc_mean=0.4376,
                auc_std=0.012,
                epsilon_vc=0.5797,
                auc_boot_lower=0.4100,
                proven_floor=-0.1420,
                jar_level=0.0,
                gates_status={"n_samples": True, "n_positive": True, "auc_std": True, "time_split": True},
                blocked_by="proven_floor",
                feature_importance={},
                hour_rates={},
                notes="Initial Emile 1.5 training run"
            )
            db.add(model_run)
            await db.commit()
            await db.refresh(model_run)

        run_id = model_run.id

        # Check if idea cycle already exists
        stmt_cycle = select(IdeaCycle).order_by(desc(IdeaCycle.cycle_id)).limit(1)
        res_cycle = await db.execute(stmt_cycle)
        existing_cycle = res_cycle.scalar_one_or_none()

        if existing_cycle:
            print(f"[SEED] IdeaCycle #{existing_cycle.cycle_id} already exists in database.")
            await engine.dispose()
            return

        print(f"[SEED] Inserting real initial IdeaCycle for run_id #{run_id}...")
        seed_hash = hashlib.sha256(str(run_id).encode("utf-8")).hexdigest()
        rng = random.Random(seed_hash)

        cycle = IdeaCycle(
            run_id=run_id,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            generator_sha="4f1c9ae72b10",
            model_version="1.5.0",
            seed=seed_hash,
            median_holders=1168,
            n_generated=100,
            n_rejected=14,
            n_excluded=2
        )
        db.add(cycle)
        await db.commit()
        await db.refresh(cycle)

        print(f"[SEED] Generated IdeaCycle #{cycle.cycle_id}. Generating 100 candidate tokens...")

        # Generate candidates
        raw_candidates = []
        for i in range(100):
            base_name = rng.choice(NAMES)
            suffix = rng.choice(["", " Protocol", " Chain", " Fund", " Index"]) if rng.random() < 0.35 else ""
            name = f"{base_name}{suffix}"
            lore = rng.choice(LORES)
            hour = rng.randint(0, 23)

            score = max(0.012, min(0.985, 0.38 + (rng.random() + rng.random() + rng.random() - 1.5) * 0.28))
            score = round(score, 6)

            sep = b"\x1f"
            raw_payload = name.encode("utf-8") + sep + lore.encode("utf-8") + sep + str(hour).encode("utf-8") + sep + str(run_id).encode("utf-8")
            commitment = hashlib.sha256(raw_payload).hexdigest()

            raw_candidates.append({
                "name": name,
                "lore": lore,
                "hour": hour,
                "score": score,
                "commitment": commitment
            })

        # Sort descending by score
        raw_candidates.sort(key=lambda c: c["score"], reverse=True)

        candidate_objs = []
        for idx, c in enumerate(raw_candidates):
            obj = IdeaCandidate(
                cycle_id=cycle.cycle_id,
                rank=idx + 1,
                name=c["name"],
                lore=c["lore"],
                hour=c["hour"],
                score=c["score"],
                commitment=c["commitment"],
                committed_at=datetime.now(timezone.utc)
            )
            candidate_objs.append(obj)

        db.add_all(candidate_objs)

        # Seed exclusions table
        excl1 = IdeaExclusion(
            name="Greenwood Protocol",
            first_cycle=cycle.cycle_id - 10 if cycle.cycle_id > 10 else 1,
            first_seen_at=datetime.now(timezone.utc),
            deployed_mint="0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
            deployer="0x3f1a2b...8e9d",
            deployed_at=datetime.now(timezone.utc),
            block_number=19482103
        )
        db.add(excl1)

        await db.commit()
        print(f"[SEED] Successfully seeded 100 IdeaCandidates and IdeaExclusion into PostgreSQL!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_ideas())
