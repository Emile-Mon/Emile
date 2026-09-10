import asyncio
import httpx
from datetime import datetime, timezone, date, timedelta
import random
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal
from app.services.lore_safety import sanitize_lore
import pandas as pd
from app.ml.trainer import train_model_and_evaluate
from app.db.models import ModelRun

ROBINHOOD_TOKEN_NAMES = [
    ("Robinhood Doge", "HOODOGE", "The official canine mascot of Robinhood Chain DEX pools. Always loyal to zero fees."),
    ("Robinhood Pepe", "HOODPEPE", "Frog of Robinhood Chain. Building liquidity line by line."),
    ("Hood Finance", "HOOD", "Decentralized governance token empowering Robinhood Chain traders."),
    ("Sherwood Swap", "WOOD", "The original yield farming protocol built on Robinhood Chain."),
    ("Little John AI", "LJOHN", "Autonomous trading agent scouting DEX pools 24/7."),
    ("Friar Tuck Gold", "TUCK", "Reserve asset backed by community vault on Robinhood Chain."),
    ("Maid Marian", "MARIAN", "Empowering decentralized liquidity providers across Robinhood ecosystem."),
    ("Nottingham Capital", "NOTT", "Community investment DAO navigating Robinhood Chain market dynamics."),
    ("Arrow Coin", "ARROW", "Bullseye accuracy in automated liquidity provision."),
    ("Bowman Protocol", "BOW", "Cross-chain bridge bringing liquidity directly into Robinhood Chain."),
    ("Target Token", "TGT", "Hitting 30K peak market cap with provable statistical evidence."),
    ("Robin Cat", "HOODCAT", "Sleek feline navigating Robinhood DEX pools at lightning speed."),
    ("Banana Jar", "JAR", "Statistical container holding provably valid Robinhood Chain tokens."),
    ("Surely Token", "SURELY", "Almost surely typing Shakespeare on the Robinhood blockchain."),
    ("Borel Monkey", "BOREL", "The infinite monkey writing token lore in the Robinhood laboratory."),
    ("Feather Coin", "FEATHER", "Lightweight utility token for Robinhood Chain micro-transactions."),
    ("Quiver Protocol", "QUIVER", "DeFi liquidity aggregator custom-tailored for Robinhood Chain."),
    ("Forest Dao", "FOREST", "Green renewable liquidity vault protecting Robinhood traders."),
    ("Outlaw Cash", "OUTLAW", "Zero tax privacy token operating on Robinhood Chain."),
    ("Chivalry Coin", "KNIGHT", "Knights of the round table guarding Robinhood Chain DEX pools."),
    ("Shield Protocol", "SHIELD", "Automated anti-mev protection layer for Robinhood Chain."),
    ("Castle AI", "CASTLE", "AI-driven liquidity optimizer analyzing peak market caps."),
    ("Crown Token", "CROWN", "Royalty token rewarding top volume pools on Robinhood Chain."),
    ("Guild Gold", "GUILD", "Guild of decentralized builders on Robinhood Chain."),
    ("Tavern Coin", "TAVERN", "Social hub token for the Robinhood Chain community.")
]

PREFIXES = ["Super", "Hyper", "Giga", "Mega", "Ultra", "Alpha", "Apex", "Nova", "Cyber", "Quantum", "Sonic", "Vortex"]
SUFFIXES = ["Robinhood", "Hood", "Chain", "Swap", "Vault", "DAO", "AI", "Lab", "Hub", "Node", "Yield", "Matrix"]

def generate_367_robinhood_tokens() -> list[dict]:
    tokens = []
    seen_mints = set()

    for i in range(367):
        # Generate clean EVM Robinhood hex address
        hex_suffix = f"{i+1:038x}"
        mint = f"0x{hex_suffix}"
        seen_mints.add(mint)

        if i < len(ROBINHOOD_TOKEN_NAMES):
            name, symbol, lore = ROBINHOOD_TOKEN_NAMES[i]
        else:
            p = random.choice(PREFIXES)
            s = random.choice(SUFFIXES)
            name = f"{p} {s} #{i+1}"
            symbol = f"{p[:3]}{s[:3]}".upper()
            lore = f"Decentralized {name} token operating natively on Robinhood Chain DEX pools."

        # Distribution of peak market cap: ~22% pass $30,000 threshold
        if random.random() < 0.22:
            peak_mc = float(random.randint(30500, 245000))
            status = "passed"
        else:
            peak_mc = float(random.randint(10200, 29800))
            status = "stalled"

        # Staggered launch timestamps over last 30 days
        days_ago = random.uniform(0.1, 30.0)
        launched_at = datetime.now(timezone.utc) - timedelta(days=days_ago)

        tokens.append({
            "mint": mint,
            "chain": "robinhood",
            "name": name,
            "symbol": symbol,
            "lore": lore,
            "image_url": f"https://api.dicebear.com/7.x/identicon/svg?seed={mint}",
            "launched_at": launched_at,
            "launch_hour": launched_at.hour,
            "peak_mc": peak_mc,
            "status": status,
            "holders": random.randint(95, 2400)
        })

    return tokens

async def seed_367_robinhood_db():
    raw_tokens = generate_367_robinhood_tokens()
    now = datetime.now(timezone.utc)
    today = date.today()

    async with AsyncSessionLocal() as db:
        print("[SEEDER] Clearing existing database tables (tokens, model_runs, daily_universe)...")
        await db.execute(text("TRUNCATE TABLE tokens, model_runs, daily_universe CASCADE;"))
        await db.commit()
        print("[SEEDER] Database cleared successfully!")

        print(f"[SEEDER] Inserting exactly {len(raw_tokens)} Robinhood Chain tokens into PostgreSQL...")
        
        passed_cnt = 0
        stalled_cnt = 0

        for t in raw_tokens:
            lore_disp, withheld, _ = sanitize_lore(t["lore"])
            if t["status"] == "passed":
                passed_cnt += 1
            else:
                stalled_cnt += 1

            query = text("""
                INSERT INTO tokens (
                    mint, chain, name, symbol, lore, lore_display, lore_withheld,
                    image_url, creator, launched_at, peak_mc, last_seen_mc,
                    status, first_seen_at, poll_count, crossed_10k_at, holders
                ) VALUES (
                    :mint, :chain, :name, :symbol, :lore, :lore_disp, :withheld,
                    :image_url, NULL, :launched_at, :peak_mc, :last_seen_mc,
                    CAST(:status AS token_status), :now, 1, :launched_at, :holders
                );
            """)

            await db.execute(query, {
                "mint": t["mint"],
                "chain": "robinhood",
                "name": t["name"],
                "symbol": t["symbol"],
                "lore": t["lore"],
                "lore_disp": lore_disp,
                "withheld": withheld,
                "image_url": t["image_url"],
                "launched_at": t["launched_at"],
                "launch_hour": t["launch_hour"],
                "peak_mc": t["peak_mc"],
                "last_seen_mc": t["peak_mc"],
                "status": t["status"],
                "now": now,
                "holders": t["holders"]
            })

        # Update daily_universe
        cur_universe = text("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (:day, :cnt, :cnt, :passed_cnt)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = EXCLUDED.minted_total,
                crossed_10k = EXCLUDED.crossed_10k,
                crossed_30k = EXCLUDED.crossed_30k;
        """)
        await db.execute(cur_universe, {"day": today, "cnt": len(raw_tokens), "passed_cnt": passed_cnt})

        await db.commit()
        print(f"[SEEDER SUCCESS] Inserted {len(raw_tokens)} Robinhood Chain tokens! (Passed: {passed_cnt}, Stalled: {stalled_cnt})")

        # Verify DB Count
        res = await db.execute(text("SELECT COUNT(*), COUNT(CASE WHEN chain='robinhood' THEN 1 END) FROM tokens;"))
        row = res.fetchone()
        print(f"[SEEDER DB VERIFY] Total Tokens: {row[0]}, Robinhood Chain Tokens: {row[1]}")

        # Train ML Model on new dataset
        print("[SEEDER] Training ML model on 367 Robinhood Chain tokens...")
        df_res = await db.execute(text("SELECT * FROM tokens WHERE status IN ('passed', 'stalled');"))
        rows = df_res.mappings().all()
        if len(rows) >= 20:
            df = pd.DataFrame(rows)
            df["launch_hour_utc"] = df["launch_hour_utc"].astype(float)
            df["holders"] = df["holders"].fillna(120).astype(float)
            df["peak_mc"] = df["peak_mc"].astype(float)

            model_eval = train_model_and_evaluate(df)
            print("[SEEDER] MODEL EVALUATION RESULT:", model_eval)

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
                print("[SEEDER] Model run metrics saved to database successfully!")

if __name__ == "__main__":
    asyncio.run(seed_367_robinhood_db())
