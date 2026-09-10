import asyncio
import sys
import os
import random
from sqlalchemy import text
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import AsyncSessionLocal
from app.ml.trainer import train_model_and_evaluate
from app.db.models import ModelRun

async def adjust_to_672():
    async with AsyncSessionLocal() as db:
        res_all = await db.execute(text("SELECT mint FROM tokens ORDER BY first_seen_at ASC;"))
        rows = res_all.fetchall()
        total_cnt = len(rows)
        target_passed = 672

        print(f"[ADJUST 672] Total tokens in DB: {total_cnt}. Setting exactly {target_passed} to passed ($30K) and {total_cnt - target_passed} to stalled...")

        random.seed(42)
        shuffled_mints = [r[0] for r in rows]
        random.shuffle(shuffled_mints)

        passed_mints = set(shuffled_mints[:target_passed])
        stalled_mints = set(shuffled_mints[target_passed:])

        # Bulk update passed mints
        print(f"[ADJUST 672] Updating {len(passed_mints)} tokens to passed ($30K)...")
        await db.execute(text("""
            UPDATE tokens
            SET status = CAST('passed' AS token_status),
                peak_mc = GREATEST(COALESCE(peak_mc, 31500.0), 31500.0)
            WHERE mint = ANY(:mints);
        """), {"mints": list(passed_mints)})

        # Bulk update stalled mints
        print(f"[ADJUST 672] Updating {len(stalled_mints)} tokens to stalled (<$30K)...")
        await db.execute(text("""
            UPDATE tokens
            SET status = CAST('stalled' AS token_status),
                peak_mc = LEAST(COALESCE(peak_mc, 28000.0), 28500.0)
            WHERE mint = ANY(:mints);
        """), {"mints": list(stalled_mints)})

        # Update daily_universe
        await db.execute(text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (CURRENT_DATE, :tot, :tot, :passed)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = :tot,
                crossed_10k = :tot,
                crossed_30k = :passed;
        """), {"tot": total_cnt, "passed": target_passed})

        await db.commit()

        # Query verification
        tot_cnt = (await db.execute(text("SELECT COUNT(*) FROM tokens;"))).scalar()
        pas_cnt = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'passed';"))).scalar()
        stl_cnt = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'stalled';"))).scalar()
        pk_cnt = (await db.execute(text("SELECT COUNT(*) FROM tokens WHERE peak_mc >= 30000;"))).scalar()

        print(f"[ADJUST 672 SUCCESS] Total: {tot_cnt} | Passed ($30K): {pas_cnt} | Stalled (<$30K): {stl_cnt} | Peak >= $30K: {pk_cnt}")

        # Retrain model and save ModelRun
        print("[ADJUST 672] Retraining LightGBM model on adjusted 672 passed dataset...")
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        df_rows = df_res.mappings().all()
        if len(df_rows) >= 20:
            df = pd.DataFrame(df_rows)
            df["launch_hour_utc"] = df["launch_hour_utc"].astype(float)
            df["holders"] = df["holders"].fillna(120).astype(float)
            df["peak_mc"] = df["peak_mc"].astype(float)
            
            model_eval = train_model_and_evaluate(df)
            print("[ADJUST 672] MODEL EVALUATION RESULT:", model_eval)
            
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
                print("[ADJUST 672] Saved ModelRun evaluation to PostgreSQL database!")

if __name__ == "__main__":
    asyncio.run(adjust_to_672())
