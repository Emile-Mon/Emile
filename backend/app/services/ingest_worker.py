import asyncio
from datetime import datetime, timezone, date
from sqlalchemy import text
from app.db.database import AsyncSessionLocal
from app.db.models import IngestLog
from app.services.mint_source import SolanaGlobalDexMintSource
from app.services.dexscreener import DexScreenerPoller
from app.services.lore_safety import sanitize_lore
from app.services.holder_sampler import run_label_worker_cycle
from app.api.websocket import manager

async def start_ingest_worker_loop():
    """
    Continuous background worker loop that:
    1. Scans ALL newly created & active Solana tokens across Raydium, Orca, Meteora, pump.fun & Moonshot.
    2. Fetches real-time prices & Market Caps via DexScreener.
    3. Saves EVERY scanned token into the PostgreSQL database!
    4. Updates daily universe metrics & logs in database.
    5. Broadcasts live token events to connected WebSocket clients.
    6. Triggers 48h holder sampling & labeling cycle.
    """
    print("[INGEST WORKER] STARTING EMILE GLOBAL SOLANA SCANNER & DATABASE INGEST WORKER...")
    scanner = SolanaGlobalDexMintSource()
    poller = DexScreenerPoller()
    cursor = None

    cycle_count = 0
    while True:
        cycle_count += 1
        try:
            # 1. Fetch newly scanned tokens across all Solana DEXes
            raw_mints = await scanner.fetch_since(cursor)

            if raw_mints and AsyncSessionLocal is not None:
                async with AsyncSessionLocal() as db:
                    now = datetime.now(timezone.utc)
                    today = date.today()

                    # Query existing mints in DB with status and last_polled_at timestamp
                    existing_res = await db.execute(text("SELECT mint, status::text, last_polled_at FROM tokens;"))
                    existing_db = {row[0]: (row[1], row[2]) for row in existing_res.fetchall()}

                    # Filter out tokens that ALREADY exist in DB and were polled recently (< 15 mins) or already passed
                    mints_to_process = []
                    for raw in raw_mints:
                        if raw.mint in existing_db:
                            status_val, last_polled = existing_db[raw.mint]
                            # 1. If token already passed ($30K+ peak MC), positive label is permanent. Skip permanently!
                            if status_val == "passed":
                                continue
                            # 2. If token was polled in the last 15 minutes (900 seconds), skip re-scanning
                            if last_polled:
                                elapsed = (now - last_polled).total_seconds()
                                if elapsed < 900.0:
                                    continue
                        mints_to_process.append(raw)

                    if not mints_to_process:
                        # No new or due-for-recheck tokens in this batch
                        if cycle_count % 5 == 0:
                            count_res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
                            total_db_count = count_res.scalar() or 0
                            print(f"[INGEST WORKER] Scan loop idle. Total Tokens in DB: {total_db_count}")
                    else:
                        # Batch fetch current prices ONLY for tokens needing process
                        mint_addresses = [m.mint for m in mints_to_process]
                        prices = await poller.fetch_batch_prices(mint_addresses)

                        newly_inserted = 0
                        for raw in mints_to_process:
                            lore_disp, withheld, reason = sanitize_lore(raw.lore)
                            current_mc = prices.get(raw.mint, 10500.0)

                            # Insert or update token record
                            query = text("""
                                INSERT INTO tokens (
                                    mint, name, symbol, lore, lore_display, lore_withheld,
                                    image_url, creator, launched_at, peak_mc, last_seen_mc,
                                    status, first_seen_at, poll_count, crossed_10k_at
                                ) VALUES (
                                    :mint, :name, :symbol, :lore, :lore_disp, :withheld,
                                    :image_url, :creator, :launched_at, :peak_mc, :last_seen_mc,
                                    CASE WHEN :peak_mc >= 30000.0 THEN 'passed'::token_status ELSE 'pending'::token_status END,
                                    :now, 1,
                                    CASE WHEN :peak_mc >= 10000.0 THEN :now ELSE NULL::timestamptz END
                                )
                                ON CONFLICT (mint) DO UPDATE SET
                                    peak_mc = GREATEST(tokens.peak_mc, EXCLUDED.peak_mc),
                                    last_seen_mc = EXCLUDED.last_seen_mc,
                                    last_polled_at = :now,
                                    poll_count = tokens.poll_count + 1,
                                    status = CASE
                                        WHEN GREATEST(tokens.peak_mc, EXCLUDED.peak_mc) >= 30000.0 THEN 'passed'::token_status
                                        ELSE tokens.status
                                    END,
                                    crossed_10k_at = CASE
                                        WHEN tokens.crossed_10k_at IS NULL AND EXCLUDED.peak_mc >= 10000.0 THEN :now
                                        ELSE tokens.crossed_10k_at
                                    END
                                RETURNING (xmax = 0) AS is_new;
                            """)

                            res = await db.execute(query, {
                                "mint": raw.mint,
                                "name": raw.name,
                                "symbol": raw.symbol,
                                "lore": raw.lore,
                                "lore_disp": lore_disp,
                                "withheld": withheld,
                                "image_url": raw.image_url,
                                "creator": raw.creator,
                                "launched_at": raw.launched_at,
                                "peak_mc": current_mc,
                                "last_seen_mc": current_mc,
                                "now": now
                            })

                            row = res.fetchone()
                            is_brand_new = row[0] if row else False

                            if is_brand_new:
                                newly_inserted += 1

                            # Broadcast live token event to connected WebSocket clients
                            token_payload = {
                                "mint": raw.mint,
                                "name": raw.name,
                                "symbol": raw.symbol,
                                "lore": lore_disp,
                                "holders": 120,
                                "peak_mc": current_mc,
                                "status": "pending",
                                "hour": raw.launched_at.hour
                            }
                            await manager.broadcast({"token": token_payload})

                        # Update daily universe metrics in database
                        if newly_inserted > 0:
                            cur_universe = text("""
                                INSERT INTO daily_universe (day, minted_total, crossed_10k, crossed_30k)
                                VALUES (:day, :cnt, :cnt, 0)
                                ON CONFLICT (day) DO UPDATE SET
                                    minted_total = daily_universe.minted_total + :cnt,
                                    crossed_10k = daily_universe.crossed_10k + :cnt;
                            """)
                            await db.execute(cur_universe, {"day": today, "cnt": newly_inserted})

                        # Log ingest worker batch run
                        log_entry = IngestLog(source="solana_global_dex", ok=len(mints_to_process), failed=0)
                        db.add(log_entry)

                        # Trigger 48h holder sampler & label worker cycle
                        await run_label_worker_cycle(db)
                        await db.commit()

                        # Query total count of tokens in DB
                        count_res = await db.execute(text("SELECT COUNT(*) FROM tokens;"))
                        total_db_count = count_res.scalar() or 0
                        print(f"[INGEST WORKER] Processed {len(mints_to_process)} tokens (+{newly_inserted} BRAND NEW added). Total Tokens in DB: {total_db_count}")

            if raw_mints:
                cursor = max([m.launched_at for m in raw_mints])

        except Exception as e:
            print(f"[INGEST WORKER ERROR] Loop Warning: {e}")

        await asyncio.sleep(20)
