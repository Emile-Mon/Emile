"""
Backfill real Robinhood Chain tokens into `tokens` from onchain history, until the labeled set reaches a target.

Every number comes from the chain (plus hourly ETH/USD from CoinGecko):
- universe: Uniswap V2 PairCreated events (factory), WETH pairs only, newest first
- peak market cap: max over the pair's Sync events of (WETH reserve / token reserve) x totalSupply x ETH/USD
- launched_at: block time of PairCreated; crossed_10k_at: first Sync at or above $10K
- holders: non-zero balances 48h after launch, rebuilt from the token's Transfer logs
- label (methodology): peak >= $30K passed; $10K..$30K and age >= 48h stalled; otherwise skipped (pending)
Rows that already exist are never touched (ON CONFLICT DO NOTHING).

Usage (from backend/):
  python -m app.db.backfill_universe --target-labeled 2004 --dry-run
  python -m app.db.backfill_universe --target-labeled 2004
Set RPC_PIN_IP to reach the RPC through a fixed IP when local DNS is hijacked.
"""
import argparse
import asyncio
import bisect
import os
import socket
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import text

if os.getenv("RPC_PIN_IP"):
    _orig_gai = socket.getaddrinfo

    def _pinned(host, *a, **k):
        if host in ("rpc.mainnet.chain.robinhood.com", b"rpc.mainnet.chain.robinhood.com"):
            host = os.environ["RPC_PIN_IP"]
        return _orig_gai(host, *a, **k)
    socket.getaddrinfo = _pinned

from app.core.config import settings
from app.db.database import AsyncSessionLocal, engine
from app.services.chain_reader import ChainReader, TOPIC_TRANSFER, topic_to_address

FACTORY = "0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f"
TOPIC_PAIR_CREATED = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9"
TOPIC_SYNC = "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
WETH = settings.WETH.lower()
ZERO = "0x" + "0" * 40
SCAN_WINDOW = 1_000_000      # PairCreated per window stays well under the 10k-log cap
ADDR_WINDOW = 10_000_000     # node limit for address-filtered getLogs
MC_10K, MC_30K = 10_000.0, 30_000.0
LABEL_AGE = timedelta(hours=48)
SKIP_SYMBOLS = {"USDC", "USDT", "DAI", "USDE", "WETH", "WBTC", "ETH", "BTC", "CBBTC", "USDS", "PYUSD", "FDUSD"}


def _abi_string(hexdata: str) -> str:
    raw = bytes.fromhex(hexdata[2:]) if hexdata and hexdata != "0x" else b""
    try:
        if len(raw) >= 64:
            ln = int.from_bytes(raw[32:64], "big")
            return raw[64:64 + ln].decode("utf-8", "ignore").strip("\x00").strip()
        return raw.rstrip(b"\x00").decode("utf-8", "ignore").strip()  # bytes32-style
    except Exception:
        return ""


class BlockClock:
    """Block -> time by interpolating between sampled anchor blocks (exact at anchors, minutes off between)."""

    def __init__(self, anchors: dict[int, datetime]):
        self.blocks = sorted(anchors)
        self.times = [anchors[b] for b in self.blocks]

    def at(self, block: int) -> datetime:
        i = bisect.bisect_left(self.blocks, block)
        if i <= 0:
            return self.times[0]
        if i >= len(self.blocks):
            return self.times[-1]
        b0, b1 = self.blocks[i - 1], self.blocks[i]
        t0, t1 = self.times[i - 1], self.times[i]
        return t0 + (t1 - t0) * ((block - b0) / (b1 - b0))

    def block_at(self, when: datetime) -> int:
        i = bisect.bisect_left(self.times, when)
        if i <= 0:
            return self.blocks[0]
        if i >= len(self.times):
            return self.blocks[-1]
        t0, t1 = self.times[i - 1], self.times[i]
        b0, b1 = self.blocks[i - 1], self.blocks[i]
        return int(b0 + (b1 - b0) * ((when - t0) / (t1 - t0)))


class EthUsd:
    def __init__(self, points: list[list[float]]):
        self.ts = [datetime.fromtimestamp(p[0] / 1000, tz=timezone.utc) for p in points]
        self.px = [p[1] for p in points]

    def at(self, when: datetime) -> float:
        i = min(max(bisect.bisect_left(self.ts, when), 0), len(self.ts) - 1)
        return self.px[i]


async def _batched(reader: ChainReader, calls: list[tuple[str, list]], size: int = 20) -> list:
    out = []
    for i in range(0, len(calls), size):
        out.extend(await reader._batch(calls[i:i + size]))
    return out


async def logs_range(reader, address, topics, frm, to):
    """Address-filtered logs over [frm, to], splitting windows and halving on the 10k-log cap."""
    out, start = [], frm
    while start <= to:
        end = min(to, start + ADDR_WINDOW - 1)
        try:
            out += await reader.get_logs(start, end, address=address, topics=topics)
            start = end + 1
        except Exception as e:
            if "exceeds limit" in str(e) and end > start:
                mid = (start + end) // 2
                out += await logs_range(reader, address, topics, start, mid)
                start = mid + 1
            else:
                raise
    return out


async def main(target: int, dry_run: bool, max_pairs: int):
    reader = ChainReader(settings.CHAIN_RPC_URL, timeout=60)
    assert await reader.chain_id() == settings.CHAIN_ID, "RPC is not Robinhood Chain"
    head = await reader.block_number()
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        labeled = (await db.execute(text("SELECT count(*) FROM tokens WHERE status::text IN ('passed','stalled')"))).scalar()
        known = {r[0].lower() for r in (await db.execute(text("SELECT mint FROM tokens"))).all()}
    need = target - labeled
    print(f"[BACKFILL] labeled now {labeled}, target {target}, need {need}, known tokens {len(known)}")
    if need <= 0:
        return

    async with httpx.AsyncClient(timeout=30) as http:
        cg = (await http.get("https://api.coingecko.com/api/v3/coins/ethereum/market_chart",
                             params={"vs_currency": "usd", "days": 90})).json()
    eth = EthUsd(cg["prices"])
    oldest_price = eth.ts[0]

    anchors_blocks = list(range(head, max(0, head - 80_000_000), -1_000_000))
    anchors = await reader.block_timestamps(set(anchors_blocks))
    clock = BlockClock(anchors)

    picked: list[dict] = []
    scanned = 0
    window_end = head
    while len(picked) < need and scanned < max_pairs and window_end > 0:
        window_start = max(0, window_end - SCAN_WINDOW + 1)
        created = await reader.get_logs(window_start, window_end, address=FACTORY, topics=[TOPIC_PAIR_CREATED])
        window_end = window_start - 1
        pairs = []
        for lg in sorted(created, key=lambda l: int(l["blockNumber"], 16), reverse=True):
            t0, t1 = topic_to_address(lg["topics"][1]), topic_to_address(lg["topics"][2])
            if WETH not in (t0, t1) or t0 == t1:
                continue
            token = t1 if t0 == WETH else t0
            if token in known:
                continue
            pairs.append({"pair": "0x" + lg["data"][26:66], "token": token, "weth_is_0": t0 == WETH,
                          "block": int(lg["blockNumber"], 16)})
        if not pairs:
            continue
        if clock.at(pairs[-1]["block"]) < oldest_price:
            print("[BACKFILL] reached the end of available ETH/USD history")
            break

        # Token metadata (current state is fine: supply/decimals/name are fixed for launchpad tokens)
        meta_calls = []
        for p in pairs:
            for sel in ("0x313ce567", "0x18160ddd", "0x06fdde03", "0x95d89b41"):  # decimals, totalSupply, name, symbol
                meta_calls.append(("eth_call", [{"to": p["token"], "data": sel}, "latest"]))
        try:
            meta = await _batched(reader, meta_calls, 20)
        except Exception:
            meta = []
            for c in meta_calls:  # one bad token reverts a whole batch: retry singly
                try:
                    meta.append(await reader._call(*c))
                except Exception:
                    meta.append(None)

        for i, p in enumerate(pairs):
            scanned += 1
            dec_h, sup_h, name_h, sym_h = meta[4 * i:4 * i + 4]
            if not dec_h or not sup_h or dec_h == "0x" or sup_h == "0x":
                continue
            decimals = int(dec_h, 16)
            supply = int(sup_h, 16) / 10 ** decimals if decimals <= 36 else 0
            symbol = _abi_string(sym_h or "0x")[:32]
            name = _abi_string(name_h or "0x")[:80]
            if not symbol or symbol.upper() in SKIP_SYMBOLS or supply < 1_000_000:
                continue

            syncs = await logs_range(reader, p["pair"], [TOPIC_SYNC], p["block"], head)
            peak, peak_at, crossed = 0.0, None, None
            for s in syncs:
                d = s["data"][2:]
                r0, r1 = int(d[0:64], 16), int(d[64:128], 16)
                rw, rt = (r0, r1) if p["weth_is_0"] else (r1, r0)
                if rt == 0 or rw == 0:
                    continue
                when = clock.at(int(s["blockNumber"], 16))
                mc = (rw / 1e18) / (rt / 10 ** decimals) * supply * eth.at(when)
                if mc > peak:
                    peak, peak_at = mc, when
                if crossed is None and mc >= MC_10K:
                    crossed = when
            if peak < MC_10K:
                continue
            launched = clock.at(p["block"])
            if peak >= MC_30K:
                status = "passed"
            elif now - launched >= LABEL_AGE:
                status = "stalled"
            else:
                continue  # still pending; not labeled yet

            holders, sampled_at = None, None
            if now - launched >= LABEL_AGE:
                sampled_at = launched + LABEL_AGE
                end_block = clock.block_at(sampled_at)
                transfers = await logs_range(reader, p["token"], [TOPIC_TRANSFER], p["block"] - 2000, end_block)
                bal: dict[str, int] = {}
                for t in transfers:
                    if len(t["topics"]) < 3:
                        continue
                    amt = int(t["data"], 16) if t["data"] not in ("0x", "") else 0
                    f, to = topic_to_address(t["topics"][1]), topic_to_address(t["topics"][2])
                    bal[f] = bal.get(f, 0) - amt
                    bal[to] = bal.get(to, 0) + amt
                holders = sum(1 for a, v in bal.items() if v > 0 and a != ZERO)

            picked.append({
                "mint": p["token"], "name": name or symbol, "symbol": symbol, "launched_at": launched,
                "launch_hour": launched.hour, "peak_mc": round(peak, 2), "crossed": crossed,
                "holders": holders, "sampled_at": sampled_at, "status": status,
            })
            known.add(p["token"])
            if len(picked) % 25 == 0:
                print(f"[BACKFILL] picked {len(picked)}/{need} (scanned {scanned} pairs, back to {launched:%Y-%m-%d %H:%M})")
            if len(picked) >= need:
                break

    await reader.aclose()
    passed = sum(1 for t in picked if t["status"] == "passed")
    print(f"[BACKFILL] picked {len(picked)} tokens: {passed} passed, {len(picked) - passed} stalled; scanned {scanned} pairs")
    if picked:
        print("[BACKFILL] sample:", [(t["symbol"], int(t["peak_mc"]), t["status"], t["holders"]) for t in picked[:5]])
    if dry_run or not picked:
        print("[BACKFILL] dry run: nothing written")
        await engine.dispose()
        return

    async with AsyncSessionLocal() as db:
        for t in picked:
            await db.execute(text("""
                INSERT INTO tokens (mint, chain, name, symbol, lore, launched_at, launch_hour_utc, peak_mc, last_seen_mc,
                                    crossed_10k_at, holders, holders_sampled_at, status, labeled_at, first_seen_at, poll_count)
                VALUES (:mint, 'robinhood', :name, :symbol, NULL, :launched_at, :launch_hour, :peak_mc, NULL,
                        :crossed, :holders, :sampled_at, CAST(:status AS token_status), now(), now(), 0)
                ON CONFLICT (mint) DO NOTHING
            """), t)
        await db.execute(text(
            "INSERT INTO ingest_log (source, ok, failed) VALUES ('backfill_onchain', :ok, 0)"), {"ok": len(picked)})
        await db.commit()
        total = (await db.execute(text("SELECT count(*) FROM tokens WHERE status::text IN ('passed','stalled')"))).scalar()
    print(f"[BACKFILL] written. labeled now {total}")
    await engine.dispose()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-labeled", type=int, required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max-pairs", type=int, default=40_000)
    a = ap.parse_args()
    asyncio.run(main(a.target_labeled, a.dry_run, a.max_pairs))
