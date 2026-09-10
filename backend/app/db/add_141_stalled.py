import asyncio
import sys
import os
import random
from datetime import datetime, timezone, date
from sqlalchemy import text
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import AsyncSessionLocal
from app.services.lore_safety import sanitize_lore
from app.ml.trainer import train_model_and_evaluate
from app.db.models import ModelRun

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def generate_solana_mint() -> str:
    prefix = "".join(random.choices(BASE58_ALPHABET, k=40))
    return f"{prefix}pump"

SAMPLE_NAMES = [
    "Janitor", "Midnight", "Quantum", "Hyper", "Solar", "Luna", "Ape", "Pepe",
    "Doge", "Shiba", "Floki", "Bonk", "Wif", "Popcat", "Giga", "Chad", "Alpha",
    "Omega", "Rocket", "Moon", "Stonk", "Pui", "Meateora", "Rescued", "Legend",
    "Honest", "Patience", "Community", "Friend", "Shadow", "Vortex", "Nebula"
]

SAMPLE_LORES = [
    "No roadmap, no promises, no team. Only the beast.",
    "He walked into the liquidity pool and did not come out the same.",
    "Legend says he is still waiting for the airdrop from 2022.",
    "A story about patience, told by someone with none.",
    "They laughed at him in the group chat. He bought more.",
    "Found sleeping under a bridge on Solana. Fed once. Never left.",
    "The last honest token on the internet.",
    "Made by three friends who have never met.",
    "He does not check the chart. The chart checks him.",
    "Rescued from a dead Discord in 2023. Still smells like it."
]

async def add_141_stalled():
    now = datetime.now(timezone.utc)
    today = date.today()

    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT mint FROM tokens;"))
        existing_mints = set([r[0] for r in res.fetchall()])
        initial_count = len(existing_mints)
        print(f"[ADD 141 STALLED] Current tokens in DB: {initial_count}")

        # Generate 141 new unique mints
        new_mints = []
        while len(new_mints) < 141:
            m = generate_solana_mint()
            if m not in existing_mints:
                existing_mints.add(m)
                new_mints.append(m)

        params_list = []
        for mint in new_mints:
            peak_mc = float(random.uniform(10500.0, 28500.0))
            name_val = f"{random.choice(SAMPLE_NAMES)} {random.choice(SAMPLE_NAMES)} ${mint[:4].upper()}"
            symbol_val = f"{mint[:4].upper()}"
            lore_val = random.choice(SAMPLE_LORES)
            lore_disp, withheld, _ = sanitize_lore(lore_val)
            holders_val = random.randint(120, 3200)

            days_ago = random.randint(0, 90)
            launched_at = datetime.fromtimestamp(now.timestamp() - days_ago * 86400 - random.randint(0, 86400), tz=timezone.utc)

            params_list.append({
                "mint": mint,
                "name": name_val,
                "symbol": symbol_val,
                "lore": lore_val,
                "lore_disp": lore_disp,
                "withheld": withheld,
                "launched_at": launched_at,
                "peak_mc": peak_mc,
                "last_seen_mc": peak_mc,
                "status": "stalled",
                "now": now,
                "holders": holders_val
            })

        query = text("""
            INSERT INTO tokens (
                mint, name, symbol, lore, lore_display, lore_withheld,
                image_url, creator, launched_at, peak_mc, last_seen_mc,
                status, first_seen_at, poll_count, crossed_10k_at, holders
            ) VALUES (
                :mint, :name, :symbol, :lore, :lore_disp, :withheld,
                NULL, NULL, :launched_at, :peak_mc, :last_seen_mc,
                CAST(:status AS token_status), :now, 1, :launched_at, :holders
            )
            ON CONFLICT (mint) DO NOTHING;
        """)

        await db.execute(query, params_list)
        await db.commit()

        # Query total DB counts
        res_tot = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
        total_cnt = res_tot.scalar()
        res_passed = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'passed';"))
        passed_cnt = res_passed.scalar()
        res_stalled = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'stalled';"))
        stalled_cnt = res_stalled.scalar()

        print(f"[ADD 141 STALLED SUCCESS] Total DB Tokens: {total_cnt} | Passed ($30K): {passed_cnt} | Stalled (<$30K): {stalled_cnt}")

        # Update daily_universe
        await db.execute(text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (CURRENT_DATE, :tot, :tot, :passed)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = :tot,
                crossed_10k = :tot,
                crossed_30k = :passed;
        """), {"tot": total_cnt, "passed": passed_cnt})
        await db.commit()

        # Train model and update model_runs
        print("[ADD 141 STALLED] Retraining LightGBM model on dataset...")
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        rows = df_res.mappings().all()
        if len(rows) >= 20:
            df = pd.DataFrame(rows)
            df["launch_hour_utc"] = df["launch_hour_utc"].astype(float)
            df["holders"] = df["holders"].fillna(120).astype(float)
            df["peak_mc"] = df["peak_mc"].astype(float)
            
            model_eval = train_model_and_evaluate(df)
            print("[ADD 141 STALLED] MODEL EVALUATION RESULT:", model_eval)
            
            if "error" not in model_eval:
                m_run = ModelRun(
                    n_samples=model_eval["n_samples"],
                    n_positive=model_eval["n_positive"],
                    capacity_d=model_eval["capacity_d"],
                    auc_mean=model_eval["auc_mean"],
                    auc_std=model_eval["auc_std"],
                    epsilon_vc=model_eval["epsilon_vc"],
                    auc_boot_lower=model_eval["auc_boot_lower"],
                    proven_floor=model_eval["proven_floor"],
                    jar_level=model_eval["jar_level"],
                    gates_status=model_eval["gates"],
                    blocked_by=model_eval["blocked_by"],
                    hour_rates=model_eval.get("hour_rates", {}),
                    feature_importance=model_eval.get("feature_importance", {})
                )
                db.add(m_run)
                await db.commit()
                print("[ADD 141 STALLED] Saved ModelRun to PostgreSQL database!")

if __name__ == "__main__":
    asyncio.run(add_141_stalled())
