import os
import psycopg2
from app.core.config import settings

def execute_ddl_remote():
    url = settings.DATABASE_URL_SYNC
    print(f"Connecting to Prisma PostgreSQL with psycopg2: {url[:40]}...")
    
    # Connect with SSL required
    conn = psycopg2.connect(url, sslmode="require")
    cursor = conn.cursor()

    ddl_path = os.path.join(os.path.dirname(__file__), "..", "..", "DDL.sql")
    with open(ddl_path, "r", encoding="utf-8") as f:
        ddl_sql = f.read()

    print("Executing DDL script on remote Prisma PostgreSQL database...")
    cursor.execute(ddl_sql)
    conn.commit()
    print("SUCCESS: DDL Script executed and all tables created in Prisma PostgreSQL!")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    execute_ddl_remote()
