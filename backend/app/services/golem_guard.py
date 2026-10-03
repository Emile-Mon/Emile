"""
Golem trading guard. Any trade executor MUST call `record_trade_decision` before sending a swap:
it refuses unless Epoch II is complete and the live model still passes every gate with a floor at target.
Epoch II stays complete forever, but trading pauses whenever the live model regresses.
"""
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

from app.core.config import settings
from app.api.endpoints import get_latest_model, serialize_model_run
from app.api.epochs_endpoints import load_completed
from app.services.epochs import Completion, golem_paused


class GolemPausedError(RuntimeError):
    pass


@dataclass(frozen=True)
class TradeGate:
    allowed: bool
    reason: Optional[str]  # None when allowed


def trade_gate(completed: dict[int, Completion], model: Optional[dict], target_auc: float) -> TradeGate:
    if 2 not in completed:
        return TradeGate(False, "epoch_ii_not_complete")
    paused = golem_paused(model, completed, target_auc)
    if paused:
        return TradeGate(False, paused)
    return TradeGate(True, None)


async def current_trade_gate(db) -> tuple[TradeGate, Optional[dict]]:
    completed = await load_completed(db)
    latest = await get_latest_model(db)
    model = serialize_model_run(latest) if latest else None
    return trade_gate(completed, model, settings.AUC_TARGET), model


async def record_trade_decision(db, *, token: str, side: str, survival_probability: float, top_signal: str) -> int:
    """Check the gate and log the decision. Returns the decision id; raises GolemPausedError if trading is paused."""
    gate, model = await current_trade_gate(db)
    if not gate.allowed:
        raise GolemPausedError(f"Golem paused: {gate.reason}")
    if side not in ("buy", "sell"):
        raise ValueError("side must be 'buy' or 'sell'")
    if not 0.0 <= survival_probability <= 1.0:
        raise ValueError("survival_probability must be within [0, 1]")
    row = (await db.execute(text(
        "INSERT INTO golem_trade_decisions (token, side, survival_probability, top_signal, run_id) "
        "VALUES (:token, :side, :p, :signal, :run) RETURNING id"
    ), {"token": token.lower(), "side": side, "p": survival_probability, "signal": top_signal,
        "run": model["run_id"]})).first()
    await db.commit()
    return row[0]


async def attach_trade_tx(db, decision_id: int, tx_hash: str) -> None:
    """Link a decision to the swap tx it produced (the indexer fills in the onchain side)."""
    res = await db.execute(text(
        "UPDATE golem_trade_decisions SET tx_hash = :h WHERE id = :id AND tx_hash IS NULL"
    ), {"h": tx_hash.lower(), "id": decision_id})
    if res.rowcount != 1:
        raise RuntimeError(f"Decision {decision_id} missing or already linked to a tx")
    await db.commit()
