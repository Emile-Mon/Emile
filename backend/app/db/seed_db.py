import asyncio
from datetime import datetime, timezone, date, timedelta
import random
import psycopg2
from app.core.config import settings

SAMPLE_TOKENS = [
    ("7xKXtg2CW87d97TXJSD3b9P1", "Quantum Capybara", "QCAPY", "He was fired on a Tuesday and never went back. The chart is his resignation letter.", 35400.0, "passed", 487),
    ("8mPzYv3K9x1W4nL7qJ5t2R6s", "Retro Hamster", "RHAM", "Born in a server room in 2021. Refuses to explain himself.", 12400.0, "stalled", 142),
    ("3bL9qR7t2X5w1N8v6K4mP0jY", "Silent Toaster", "STOA", "Every holder gets a seat at the table. The table is imaginary.", 48900.0, "passed", 820),
    ("9vX4kM1nT6r8P2w5J0y3L7sQ", "Golden Monk", "GMONK", "Community takeover. The original dev left a note and one sock.", 18200.0, "stalled", 210),
    ("5nJ2wP8y4K1r7T0x9M6s3L5q", "Midnight Pigeon", "MPIGEON", "No roadmap, no promises, no team. Only the beast.", 27900.0, "stalled", 310),
    ("2wL7mK5nR8p1X4t0v9Y3j6sQ", "Feral Frog", "FFROG", "He walked into the liquidity pool and did not come out the same.", 54100.0, "passed", 1120),
    ("6qP0yM3r9K2t5W8x1N4s7v9J", "Holy Goose", "HGOOSE", "Legend says he is still waiting for the airdrop from 2022.", 15600.0, "stalled", 188),
    ("1tR4kL8w2N9p5M0x7V3s6j2Y", "Broke Wizard", "BWIZ", "A story about patience, told by someone with none.", 42000.0, "passed", 760),
    ("4yM8sP2t6K1w9N5x0R3j7v4L", "Cosmic Janitor", "CJAN", "They laughed at him in the group chat. He bought more.", 11400.0, "stalled", 126),
    ("0xJ6vR1nK4t8P3w9L2s5m7y1Q", "Tiny Shrimp", "TSHRIMP", "Found sleeping under a bridge on Solana. Fed once. Never left.", 61200.0, "passed", 1450)
]

def seed_remote_database():
    url = settings.DATABASE_URL_SYNC
    print(f"Connecting to Prisma PostgreSQL for Seeding: {url[:45]}...")
    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    now = datetime.now(timezone.utc)

    # 1. Seed tokens
    print("Seeding sample tokens into 'tokens' table...")
    for mint, name, symbol, lore, peak_mc, status, holders in SAMPLE_TOKENS:
        cur.execute("""
            INSERT INTO tokens (
                mint, name, symbol, lore, lore_display, lore_withheld,
                launched_at, peak_mc, last_seen_mc,
                crossed_10k_at, holders, holders_sampled_at, status, labeled_at,
                first_seen_at, poll_count
            ) VALUES (%s, %s, %s, %s, %s, false, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (mint) DO UPDATE SET
                peak_mc = EXCLUDED.peak_mc,
                status = EXCLUDED.status,
                holders = EXCLUDED.holders;
        """, (
            mint, name, symbol, lore, lore,
            now - timedelta(hours=50),
            peak_mc, peak_mc * 0.9,
            now - timedelta(hours=48), holders, now - timedelta(hours=2),
            status, now - timedelta(hours=2),
            now - timedelta(hours=50), 12
        ))

    # 2. Seed daily_universe
    print("Seeding daily universe metrics into 'daily_universe' table...")
    today = date.today()
    for i in range(7):
        day_date = today - timedelta(days=i)
        cur.execute("""
            INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (day) DO UPDATE SET
                minted_total = EXCLUDED.minted_total,
                crossed_10k = EXCLUDED.crossed_10k,
                crossed_30k = EXCLUDED.crossed_30k;
        """, (day_date, 340 + i * 15, 42 + i * 2, 8 + i))

    # 3. Seed model_runs
    print("Seeding initial model run metrics into 'model_runs' table...")
    cur.execute("""
        INSERT INTO model_runs (
            ran_at, n_samples, n_positive, capacity_d, auc_mean, auc_std,
            epsilon_vc, auc_boot_lower, proven_floor, jar_level, gates_status,
            blocked_by, feature_importance, hour_rates, notes
        ) VALUES (
            %s, 340, 42, 28, 0.548, 0.021, 0.048, 0.500, 0.500, 0.0,
            '{"n_samples": false, "n_positive": false, "auc_std": true, "time_split": true}'::jsonb,
            'n_samples',
            '{"holders_log": 0.35, "launch_hour": 0.25, "lore_words": 0.20, "pca_embeddings": 0.20}'::jsonb,
            '{"14": 0.31, "15": 0.29, "13": 0.26}'::jsonb,
            'Initial baseline seed run'
        );
    """, (now,))

    conn.commit()
    print("SUCCESS: Database successfully populated with initial seed data!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed_remote_database()
