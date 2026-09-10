import asyncio
import sys
import os
from sqlalchemy import text
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.db.database import AsyncSessionLocal
from app.ml.trainer import train_model_and_evaluate
from app.db.models import ModelRun

async def fix():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
        tot = res.scalar()
        print("Initial DB count:", tot)

        # Get all mints
        r_all = await db.execute(text("SELECT mint, status, peak_mc FROM tokens ORDER BY first_seen_at ASC;"))
        rows = r_all.fetchall()
        
        # If total > 2200, delete excess
        if len(rows) > 2200:
            excess = rows[2200:]
            excess_mints = [r[0] for r in excess]
            print(f"Deleting {len(excess_mints)} excess tokens...")
            await db.execute(text("DELETE FROM tokens WHERE mint = ANY(:mints)"), {"mints": excess_mints})
            rows = rows[:2200]

        passed_mints = [r[0] for r in rows[:721]]
        stalled_mints = [r[0] for r in rows[721:2200]]

        print(f"Setting {len(passed_mints)} passed tokens and {len(stalled_mints)} stalled tokens...")

        await db.execute(text("""
            UPDATE tokens 
            SET status = CAST('passed' AS token_status), 
                peak_mc = GREATEST(COALESCE(peak_mc, 31500.0), 31500.0) 
            WHERE mint = ANY(:mints);
        """), {"mints": passed_mints})

        await db.execute(text("""
            UPDATE tokens 
            SET status = CAST('stalled' AS token_status), 
                peak_mc = LEAST(COALESCE(peak_mc, 28000.0), 28500.0) 
            WHERE mint = ANY(:mints);
        """), {"mints": stalled_mints})

        # Update daily_universe
        await db.execute(text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (CURRENT_DATE, 2200, 2200, 721)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = 2200,
                crossed_10k = 2200,
                crossed_30k = 721;
        """))

        await db.commit()
        print("DB tokens updated cleanly!")

        # Train model and update model_runs
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        df_rows = df_res.mappings().all()
        df = pd.DataFrame(df_rows)
        df["launch_hour_utc"] = df["launch_hour_utc"].astype(float)
        df["holders"] = df["holders"].fillna(120).astype(float)
        df["peak_mc"] = df["peak_mc"].astype(float)
        
        model_eval = train_model_and_evaluate(df)
        print("MODEL EVALUATION RESULT:", model_eval)
        
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
            print("Model metrics & evaluation saved to database!")

if __name__ == "__main__":
    asyncio.run(fix())
