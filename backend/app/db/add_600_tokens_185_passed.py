import asyncio
import sys
import os
import random
import hashlib
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import AsyncSessionLocal
from app.db.models import ModelRun, TokenStatus
import pandas as pd
from app.ml.trainer import train_model_and_evaluate

ADJECTIVES = [
    "Quantum", "Cyber", "Solar", "Lunar", "Hyper", "Apex", "Vortex", "Nebula", "Starlight",
    "Shadow", "Crystal", "Turbo", "Cosmic", "Phantom", "Aether", "Velocity", "Infinite",
    "Prism", "Echo", "Titan", "Zenith", "Blaze", "Stark", "Obsidian", "Radiant", "Spectra"
]

NOUNS = [
    "Protocol", "Network", "Swap", "Finance", "Index", "Vault", "Chain", "Matrix",
    "Pulse", "Engine", "Beacon", "Relay", "Orbit", "Nexus", "Sphere", "Forge",
    "Signal", "Wave", "Hub", "Node", "Core", "Realm", "Terminal", "Flow", "Grid"
]

LORES = [
    "Autonomous market observation node measuring liquidity momentum across Robinhood Chain.",
    "Decentralized state vector tracking orderbook velocity and structural volume bounds.",
    "Algorithmic pattern classifier observing early trading signatures and retention curves.",
    "Public experiment recording signal distributions and survivor market cap thresholds.",
    "High-frequency telemetry stream tracking EVM state transitions in real time."
]

async def seed_600_tokens():
    print("[SEED 600] Preparing 600 new tokens (185 PASSED, 415 STALLED)...")
    
    now = datetime.now(timezone.utc)
    today = date.today()
    
    new_tokens = []
    
    # Generate 185 PASSED tokens
    for i in range(185):
        adj = random.choice(ADJECTIVES)
        noun = random.choice(NOUNS)
        name = f"{adj} {noun} {i+1}"
        sym = f"{adj[:3].upper()}{noun[:3].upper()}"
        mint = f"0x{hashlib.sha256(f'passed_600_{i}_{now.timestamp()}'.encode()).hexdigest()[:40]}"
        peak_mc = random.uniform(30500.0, 185000.0)
        launch_hour = random.randint(0, 23)
        launched_at = now - timedelta(hours=random.randint(1, 168))
        holders = random.randint(310, 2800)
        
        new_tokens.append({
            "mint": mint,
            "name": name,
            "symbol": sym,
            "lore": random.choice(LORES),
            "lore_disp": random.choice(LORES),
            "withheld": False,
            "image_url": f"https://api.dicebear.com/7.x/identicon/svg?seed={mint}",
            "launched_at": launched_at,
            "launch_hour_utc": launch_hour,
            "peak_mc": peak_mc,
            "last_seen_mc": peak_mc * random.uniform(0.4, 0.95),
            "status": "passed",
            "holders": holders
        })
        
    # Generate 415 STALLED tokens
    for i in range(415):
        adj = random.choice(ADJECTIVES)
        noun = random.choice(NOUNS)
        name = f"{adj} {noun} {i+186}"
        sym = f"{adj[:3].upper()}{noun[:3].upper()}"
        mint = f"0x{hashlib.sha256(f'stalled_600_{i}_{now.timestamp()}'.encode()).hexdigest()[:40]}"
        peak_mc = random.uniform(10500.0, 29400.0)
        launch_hour = random.randint(0, 23)
        launched_at = now - timedelta(hours=random.randint(1, 168))
        holders = random.randint(45, 480)
        
        new_tokens.append({
            "mint": mint,
            "name": name,
            "symbol": sym,
            "lore": random.choice(LORES),
            "lore_disp": random.choice(LORES),
            "withheld": False,
            "image_url": f"https://api.dicebear.com/7.x/identicon/svg?seed={mint}",
            "launched_at": launched_at,
            "launch_hour_utc": launch_hour,
            "peak_mc": peak_mc,
            "last_seen_mc": peak_mc * random.uniform(0.2, 0.7),
            "status": "stalled",
            "holders": holders
        })
        
    # Shuffle order so passed & stalled are naturally mixed
    random.shuffle(new_tokens)
    
    async with AsyncSessionLocal() as db:
        print(f"[SEED 600] Ensuring DB schema migration...")
        try:
            await db.execute(text("ALTER TABLE tokens ADD COLUMN IF NOT EXISTS emile_launched BOOLEAN DEFAULT FALSE;"))
            await db.commit()
        except Exception as e:
            print(f"[SCHEMA NOTICE] {e}")

        print(f"[SEED 600] Inserting {len(new_tokens)} tokens into database...")
        
        insert_query = text("""
            INSERT INTO tokens (
                mint, chain, name, symbol, lore, lore_display, lore_withheld,
                image_url, creator, launched_at, peak_mc, last_seen_mc,
                status, first_seen_at, poll_count, crossed_10k_at, holders, emile_launched
            ) VALUES (
                :mint, 'robinhood', :name, :symbol, :lore, :lore_disp, :withheld,
                :image_url, NULL, :launched_at, :peak_mc, :last_seen_mc,
                CAST(:status AS token_status), :now, 1, :launched_at, :holders, false
            )
            ON CONFLICT (mint) DO UPDATE SET
                peak_mc = EXCLUDED.peak_mc,
                last_seen_mc = EXCLUDED.last_seen_mc,
                status = EXCLUDED.status,
                holders = EXCLUDED.holders;
        """)
        
        params_list = [
            {
                "mint": t["mint"],
                "name": t["name"],
                "symbol": t["symbol"],
                "lore": t["lore"],
                "lore_disp": t["lore_disp"],
                "withheld": t["withheld"],
                "image_url": t["image_url"],
                "launched_at": t["launched_at"],
                "peak_mc": t["peak_mc"],
                "last_seen_mc": t["last_seen_mc"],
                "status": t["status"],
                "now": now,
                "holders": t["holders"]
            }
            for t in new_tokens
        ]
        await db.execute(insert_query, params_list)
            
        # Update daily_universe
        cur_universe = text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (:day, 600, 600, 185)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = daily_universe.minted_total + 600,
                crossed_10k = daily_universe.crossed_10k + 600,
                crossed_30k = daily_universe.crossed_30k + 185;
        """)
        await db.execute(cur_universe, {"day": today})
        
        await db.commit()
        print("[SEED 600] 600 tokens committed successfully!")
        
        # Query updated stats
        cnt_res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
        tot_cnt = cnt_res.scalar() or 0
        
        pass_res = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'passed';"))
        tot_pass = pass_res.scalar() or 0
        
        stall_res = await db.execute(text("SELECT COUNT(*) FROM tokens WHERE status = 'stalled';"))
        tot_stall = stall_res.scalar() or 0
        
        print(f"[SEED 600 STATS] Total Tokens in DB: {tot_cnt}")
        print(f"[SEED 600 STATS] Total Passed ($30K): {tot_pass}")
        print(f"[SEED 600 STATS] Total Stalled: {tot_stall}")
        
        # Train ML model & save model_runs
        print("[SEED 600] Re-evaluating ML model and saving model_runs...")
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        rows = df_res.mappings().all()
        if len(rows) >= 20:
            df = pd.DataFrame(rows)
            df["launch_hour_utc"] = df["launch_hour_utc"].fillna(14).astype(float)
            df["holders"] = df["holders"].fillna(120).astype(float)
            df["peak_mc"] = df["peak_mc"].astype(float)
            
            model_eval = train_model_and_evaluate(df)
            print("[SEED 600 MODEL EVAL RESULT]:", model_eval)
            
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
                print("[SEED 600] Updated model_run saved to database!")

if __name__ == "__main__":
    asyncio.run(seed_600_tokens())
