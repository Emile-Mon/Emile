import psycopg2
from app.core.config import settings

def reset_database():
    url = settings.DATABASE_URL_SYNC
    print(f"Connecting to Prisma PostgreSQL for RESET: {url[:45]}...")
    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    print("TRUNCATING all database tables (resetting to 0)...")
    cur.execute("""
        TRUNCATE TABLE lore_moderation_log, ingest_log, model_runs, daily_universe, tokens RESTART IDENTITY CASCADE;
    """)
    conn.commit()
    print("SUCCESS: Database completely cleared! All tables reset to 0.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_database()
