"""
Trade Journal logic. Pure functions: decode what a Golem swap moved (from its receipt logs) and compute each
sell's realized result with average cost per token. Everything here is derived onchain; nothing is entered by hand.
"""
from dataclasses import dataclass
from typing import Optional

from app.services.chain_reader import TOPIC_TRANSFER, decode_transfer


def decode_swap(receipt_logs: list[dict], wallet: str, router: str, weth: str) -> dict:
    """
    Classify a router swap sent by `wallet`:
    - buy:  wallet received a token, paid in ETH/WETH (eth_amount = WETH leaving the router or the wallet)
    - sell: wallet sent a token, paid out in ETH/WETH (eth_amount = WETH reaching the router or the wallet)
    - swap: token for token with no WETH leg on the wallet's side (eth_amount None)
    """
    wallet, router, weth = wallet.lower(), router.lower(), weth.lower()
    received: dict[str, int] = {}
    sent: dict[str, int] = {}
    weth_in = weth_out = 0  # WETH entering the pool path from us / coming back to us
    for lg in receipt_logs:
        if not lg.get("topics") or lg["topics"][0] != TOPIC_TRANSFER or len(lg["topics"]) < 3:
            continue
        t = decode_transfer(lg)
        token = lg["address"].lower()
        if token == weth:
            if t["from"] in (router, wallet):
                weth_in += t["amount_wei"]
            if t["to"] in (router, wallet):
                weth_out += t["amount_wei"]
            continue
        if t["to"] == wallet:
            received[token] = received.get(token, 0) + t["amount_wei"]
        if t["from"] == wallet:
            sent[token] = sent.get(token, 0) + t["amount_wei"]

    if received and not sent:
        token, amount = max(received.items(), key=lambda kv: kv[1])
        return {"side": "buy", "token": token, "token_amount_wei": amount, "eth_amount_wei": weth_in or None}
    if sent and not received:
        token, amount = max(sent.items(), key=lambda kv: kv[1])
        return {"side": "sell", "token": token, "token_amount_wei": amount, "eth_amount_wei": weth_out or None}
    token, amount = max(received.items(), key=lambda kv: kv[1]) if received else (None, None)
    return {"side": "swap", "token": token, "token_amount_wei": amount, "eth_amount_wei": None}


@dataclass
class TradeRow:
    tx_hash: str
    block: int
    side: str
    token: Optional[str]
    token_amount_wei: Optional[int]
    eth_amount_wei: Optional[int]


def compute_results(trades: list[TradeRow]) -> dict[str, dict]:
    """
    Realized result per sell, in wei of ETH, using average cost per token across this wallet's own buys.
    Buys and token-for-token swaps have no result yet. If a sell exceeds the tracked position (tokens that
    did not come from a recorded buy), only the tracked part has a cost basis and the result is flagged partial.
    """
    position: dict[str, list[int]] = {}  # token -> [quantity, cost]
    out: dict[str, dict] = {}
    for t in sorted(trades, key=lambda r: r.block):
        if t.side not in ("buy", "sell") or t.token is None or t.token_amount_wei is None or t.eth_amount_wei is None:
            out[t.tx_hash] = {"result_wei": None, "partial_basis": False}
            continue
        qty, cost = position.setdefault(t.token, [0, 0])
        if t.side == "buy":
            position[t.token] = [qty + t.token_amount_wei, cost + t.eth_amount_wei]
            out[t.tx_hash] = {"result_wei": None, "partial_basis": False}
            continue
        matched = min(qty, t.token_amount_wei)
        basis = cost * matched // qty if qty else 0
        # Proceeds attributable to the tracked part only
        proceeds = t.eth_amount_wei * matched // t.token_amount_wei if t.token_amount_wei else 0
        position[t.token] = [qty - matched, cost - basis]
        out[t.tx_hash] = {
            "result_wei": proceeds - basis if matched else None,
            "partial_basis": matched < t.token_amount_wei,
        }
    return out
