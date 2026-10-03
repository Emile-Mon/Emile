"""
Incremental onchain indexers feeding the Epoch Watcher. Each indexer scans [cursor+1, head-CONFIRMATIONS]
in chunks and commits its rows together with its cursor, so a crash never skips or double-counts a range.
"""
from sqlalchemy import text

from app.core.config import settings
from app.services.trade_journal import decode_swap
from app.services.chain_reader import (
    ChainReader, TOPIC_TRANSFER, TOPIC_LAUNCHED, TOPIC_AGENT_UPDATED,
    address_topic, decode_transfer, decode_launched, decode_agent_updated, log_position,
)

# Stay behind the head so a reorg cannot remove an indexed log
CONFIRMATIONS = 20


async def get_cursor(db, name: str) -> int:
    row = (await db.execute(text("SELECT last_block FROM chain_cursor WHERE name = :n"), {"n": name})).first()
    return row[0] if row else settings.EPOCH_SCAN_FROM_BLOCK - 1


async def set_cursor(db, name: str, block: int) -> None:
    await db.execute(text(
        "INSERT INTO chain_cursor (name, last_block) VALUES (:n, :b) "
        "ON CONFLICT (name) DO UPDATE SET last_block = EXCLUDED.last_block"
    ), {"n": name, "b": block})


async def index_launcher(db, reader: ChainReader, frm: int, to: int) -> int:
    logs = await reader.get_logs(frm, to, address=settings.EPOCH_LAUNCHER,
                                 topics=[[TOPIC_LAUNCHED, TOPIC_AGENT_UPDATED]])
    if not logs:
        return 0
    ts = await reader.block_timestamps({log_position(lg)[0] for lg in logs})
    for lg in logs:
        block, idx = log_position(lg)
        row = {"tx": lg["transactionHash"].lower(), "li": idx, "b": block, "at": ts[block],
               "token": None, "pair": None, "agent": None}
        if lg["topics"][0] == TOPIC_LAUNCHED:
            d = decode_launched(lg)
            row.update(kind="launched", token=d["token"], pair=d["pair"])
        else:
            row.update(kind="agent_updated", agent=decode_agent_updated(lg)["new_agent"])
        await db.execute(text(
            "INSERT INTO launcher_events (tx_hash, log_index, block, at, kind, token, pair, new_agent) "
            "VALUES (:tx, :li, :b, :at, :kind, :token, :pair, :agent) ON CONFLICT DO NOTHING"
        ), row)
    return len(logs)


async def index_golem_swaps(db, reader: ChainReader, frm: int, to: int) -> int:
    """
    A router swap always moves an ERC-20 into or out of the wallet, so Transfer logs touching the wallet
    find every candidate tx. Keep only successful txs sent by the wallet to the Uniswap V2 router.
    """
    wallet_topic = address_topic(settings.GOLEM_WALLET)
    sent = await reader.get_logs(frm, to, topics=[TOPIC_TRANSFER, wallet_topic])
    received = await reader.get_logs(frm, to, topics=[TOPIC_TRANSFER, None, wallet_topic])
    hashes = sorted({lg["transactionHash"].lower() for lg in sent + received})
    if not hashes:
        return 0
    wallet, router = settings.GOLEM_WALLET.lower(), settings.UNISWAP_V2_ROUTER.lower()
    swaps = []
    for h, (tx, receipt) in (await reader.transactions_with_receipts(hashes)).items():
        if (tx.get("from") or "").lower() == wallet and (tx.get("to") or "").lower() == router                 and receipt.get("status") == "0x1":
            detail = decode_swap(receipt.get("logs") or [], wallet, router, settings.WETH)
            swaps.append((h, int(receipt["blockNumber"], 16), detail))
    if not swaps:
        return 0
    ts = await reader.block_timestamps({b for _, b, _ in swaps})
    for h, b, d in swaps:
        await db.execute(text(
            "INSERT INTO golem_swaps (tx_hash, block, at, side, token, token_amount_wei, eth_amount_wei) "
            "VALUES (:h, :b, :at, :side, :token, :ta, :ea) ON CONFLICT DO NOTHING"
        ), {"h": h, "b": b, "at": ts[b], "side": d["side"], "token": d["token"],
            "ta": d["token_amount_wei"], "ea": d["eth_amount_wei"]})
    return len(swaps)


async def index_epc_burns(db, reader: ChainReader, frm: int, to: int) -> int:
    burn = settings.EPC_BURN_ADDRESS
    logs = await reader.get_logs(frm, to, address=settings.EPOCH_TOKEN_CA,
                                 topics=[TOPIC_TRANSFER, address_topic(settings.GOLEM_WALLET), address_topic(burn)])
    if not logs:
        return 0
    ts = await reader.block_timestamps({log_position(lg)[0] for lg in logs})
    for lg in logs:
        block, idx = log_position(lg)
        await db.execute(text(
            "INSERT INTO epc_burns (tx_hash, log_index, block, at, burn_address, amount_wei) "
            "VALUES (:tx, :li, :b, :at, :burn, :amt) ON CONFLICT DO NOTHING"
        ), {"tx": lg["transactionHash"].lower(), "li": idx, "b": block, "at": ts[block],
            "burn": burn.lower(), "amt": decode_transfer(lg)["amount_wei"]})
    return len(logs)


def configured_indexers() -> list[tuple[str, object]]:
    indexers = [("launcher", index_launcher), ("golem_swaps", index_golem_swaps)]
    if settings.EPC_BURN_ADDRESS:
        # Cursor is keyed by burn address so changing it rescans from the start
        indexers.append((f"epc_burns:{settings.EPC_BURN_ADDRESS.lower()}", index_epc_burns))
    return indexers


async def run_indexers(db, reader: ChainReader) -> None:
    head = await reader.block_number() - CONFIRMATIONS
    for name, fn in configured_indexers():
        cursor = await get_cursor(db, name)
        chunks = 0
        while cursor < head and chunks < settings.EPOCH_MAX_CHUNKS_PER_TICK:
            frm = cursor + 1
            to = min(head, frm + settings.EPOCH_LOG_CHUNK_BLOCKS - 1)
            await fn(db, reader, frm, to)
            await set_cursor(db, name, to)
            await db.commit()
            cursor = to
            chunks += 1
