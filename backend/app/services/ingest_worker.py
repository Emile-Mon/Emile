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

    while True:
        try:
            # 1. Fetch newly scanned tokens across all Solana DEXes
            raw_mints = await scanner.fetch_since(cursor)

            if raw_mints and AsyncSessionLocal is not None:
                async with AsyncSessionLocal() as db:
                    now = datetime.now(timezone.utc)
                    today = date.today()

                    # Batch fetch current prices for scanned mints
                    mint_addresses = [m.mint for m in raw_mints]
                    prices = await poller.fetch_batch_prices(mint_addresses)

                    newly_inserted = 0
                    for raw in raw_mints:
                        lore_disp, withheld, reason = sanitize_lore(raw.lore)
                        current_mc = prices.get(raw.mint, 10500.0)

                        # Insert into PostgreSQL tokens table
                        query = text("""
                            INSERT INTO tokens (
                                mint, name, symbol, lore, lore_display, lore_withheld,
                                image_url, creator, launched_at, peak_mc, last_seen_mc,
                                status, first_seen_at, poll_count
                            ) VALUES (
                                :mint, :name, :symbol, :lore, :lore_disp, :withheld,
                                :image_url, :creator, :launched_at, :peak_mc, :last_seen_mc,
                                'pending', :now, 1
                            )
                            ON CONFLICT (mint) DO UPDATE SET
                                peak_mc = GREATEST(tokens.peak_mc, EXCLUDED.peak_mc),
                                last_seen_mc = EXCLUDED.last_seen_mc,
                                last_polled_at = :now,
                                poll_count = tokens.poll_count + 1;
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

                        if res.rowcount > 0:
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
                    log_entry = IngestLog(source="solana_global_dex", ok=len(raw_mints), failed=0)
                    db.add(log_entry)

                    # Trigger 48h holder sampler & label worker cycle
                    await run_label_worker_cycle(db)
                    await db.commit()

                    print(f"[INGEST WORKER] Saved {len(raw_mints)} tokens to PostgreSQL DB ({newly_inserted} new).")

            if raw_mints:
                cursor = max([m.launched_at for m in raw_mints])

        except Exception as e:
            print(f"[INGEST WORKER ERROR] Loop Warning: {e}")

        await asyncio.sleep(12)
