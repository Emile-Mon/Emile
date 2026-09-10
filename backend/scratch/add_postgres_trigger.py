import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.database import AsyncSessionLocal

async def setup_trigger():
    async with AsyncSessionLocal() as db:
        print("[TRIGGER] Creating PostgreSQL BEFORE INSERT trigger to strictly block Solana/pump tokens...")
        
        # 1. Create Function
        sql_fn = text("""
            CREATE OR REPLACE FUNCTION filter_solana_tokens_trigger()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.mint LIKE '%pump' OR NEW.name ILIKE '%solana%' OR NEW.chain = 'solana' OR NEW.chain = 'arbitrum' THEN
                    RETURN NULL;
                END IF;
                NEW.chain := 'robinhood';
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        await db.execute(sql_fn)

        # 2. Drop old trigger if exists
        sql_drop = text("DROP TRIGGER IF EXISTS trg_filter_solana ON tokens;")
        await db.execute(sql_drop)

        # 3. Create Trigger
        sql_trg = text("""
            CREATE TRIGGER trg_filter_solana
            BEFORE INSERT OR UPDATE ON tokens
            FOR EACH ROW
            EXECUTE FUNCTION filter_solana_tokens_trigger();
        """)
        await db.execute(sql_trg)

        # 4. Delete existing Solana/pump tokens
        await db.execute(text("DELETE FROM tokens WHERE mint LIKE '%pump' OR name ILIKE '%solana%' OR chain != 'robinhood';"))
        
        await db.commit()
        print("[TRIGGER SUCCESS] PostgreSQL trigger active & Solana tokens deleted!")

if __name__ == "__main__":
    asyncio.run(setup_trigger())
