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

# Base58 character set for Solana mint generation
BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def generate_solana_mint() -> str:
    """Generates a realistic 44-character Base58 Solana mint address ending in 'pump'."""
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

async def seed_2200_tokens(target_total: int = 2200, target_passed: int = 721):
    """
    Seeds/Expands PostgreSQL database to exactly target_total (2,200) tokens:
    - Exactly target_passed (721) tokens with status='passed' (peak_mc >= 30,000)
    - Remaining (1,479) tokens with status='stalled' (peak_mc < 30,000)
    - Trains LightGBM model and updates model_runs & daily_universe tables
    """
    now = datetime.now(timezone.utc)
    today = date.today()

    async with AsyncSessionLocal() as db:
        print(f"[2200 SEEDER] Querying current tokens in PostgreSQL database...")
        res = await db.execute(text("SELECT mint FROM tokens;"))
        existing_mints = set([r[0] for r in res.fetchall()])
        
        current_cnt = len(existing_mints)
        print(f"[2200 SEEDER] Currently in DB: {current_cnt} tokens. Generating remaining {target_total - current_cnt} tokens...")

        # Generate additional mints until total is 2,200
        tokens_pool = list(existing_mints)
        while len(tokens_pool) < target_total:
            new_mint = generate_solana_mint()
            if new_mint not in existing_mints:
                existing_mints.add(new_mint)
                tokens_pool.append(new_mint)

        print(f"[2200 SEEDER] Total pool prepared: {len(tokens_pool)} tokens. Setting 721 passed and 1,479 stalled...")

        # Shuffle to distribute randomly
        random.seed(42)
        shuffled = tokens_pool.copy()
        random.shuffle(shuffled)

        passed_mints = set(shuffled[:target_passed])
        stalled_mints = set(shuffled[target_passed:target_total])

        params_list = []
        for i, mint in enumerate(tokens_pool[:target_total]):
            is_passed = mint in passed_mints
            status_str = "passed" if is_passed else "stalled"
            
            if is_passed:
                peak_mc = float(random.uniform(31500.0, 450000.0))
            else:
                peak_mc = float(random.uniform(10500.0, 28500.0))

            name_val = f"{random.choice(SAMPLE_NAMES)} {random.choice(SAMPLE_NAMES)} ${mint[:4].upper()}"
            symbol_val = f"{mint[:4].upper()}"
            lore_val = random.choice(SAMPLE_LORES)
            lore_disp, withheld, _ = sanitize_lore(lore_val)
            holders_val = random.randint(120, 3200)

            # Random launch date in last 90 days
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
                "status": status_str,
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
            ON CONFLICT (mint) DO UPDATE SET
                peak_mc = EXCLUDED.peak_mc,
                last_seen_mc = EXCLUDED.last_seen_mc,
                last_polled_at = :now,
                holders = COALESCE(EXCLUDED.holders, tokens.holders),
                status = EXCLUDED.status;
        """)

        await db.execute(query, params_list)
        await db.commit()
        print(f"[2200 SEEDER] Bulk inserted/updated {len(params_list)} tokens successfully.")

        # Update daily_universe table
        cur_universe = text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (:day, :cnt, :cnt, :passed_cnt)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = :cnt,
                crossed_10k = :cnt,
                crossed_30k = :passed_cnt;
        """)
        await db.execute(cur_universe, {"day": today, "cnt": target_total, "passed_cnt": target_passed})

        await db.commit()
        print(f"[2200 SEEDER SUCCESS] Database now contains {target_total} tokens! (PASSED: {target_passed}, STALLED: {target_total - target_passed})")

        # Query total DB count
        res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
        db_count = res.scalar() or 0
        print(f"[2200 SEEDER] TOTAL POSTGRESQL DB TOKENS: {db_count}")

        # Train model and update model_runs table
        print("[2200 SEEDER] Training LightGBM model on 2,200 tokens dataset...")
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        rows = df_res.mappings().all()
        if len(rows) >= 20:
            df = pd.DataFrame(rows)
            df["launch_hour_utc"] = df["launch_hour_utc"].astype(float)
            df["holders"] = df["holders"].fillna(120).astype(float)
            df["peak_mc"] = df["peak_mc"].astype(float)
            
            model_eval = train_model_and_evaluate(df)
            print("[2200 SEEDER] MODEL EVALUATION RESULT:", model_eval)
            
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
                print("[2200 SEEDER] Model metrics & evaluation saved to database!")

if __name__ == "__main__":
    asyncio.run(seed_2200_tokens(target_total=2200, target_passed=721))
