"""
Epochs domain logic. Pure functions only (no I/O) so ordering, permanence and proof rules are unit-testable.

Rules (Developer Brief: Epochs Page):
- Epochs complete strictly in order; an epoch's evidence must postdate the previous epoch's completion.
- `active` is never stored: it is always the first epoch that is not complete.
- `complete` is permanent and always carries a valid proof.
"""
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, Optional


@dataclass(frozen=True)
class EpochDef:
    id: int
    key: str
    name: str

    @property
    def anchor(self) -> str:
        return self.key.replace("_", "-")


EPOCH_DEFS: tuple[EpochDef, ...] = (
    EpochDef(1, "ingestion", "Ingestion"),
    EpochDef(2, "hourglass_fill", "The Hourglass Fill"),
    EpochDef(3, "first_trade", "First Trade"),
    EpochDef(4, "first_burn", "First Burn"),
    EpochDef(5, "golem_launch", "The Golem Launch"),
    EpochDef(6, "open_golem", "Open Golem"),
)
EPOCH_IDS = tuple(e.id for e in EPOCH_DEFS)
MODEL_EPOCHS = (1, 2)
TX_EPOCHS = (3, 4, 5)
RELEASE_EPOCHS = (6,)


@dataclass(frozen=True)
class Completion:
    proof: dict
    completed_at: datetime


class EpochOrderError(ValueError):
    pass


class InvalidProofError(ValueError):
    pass


# ---------------------------------------------------------------------------
# Ordering
# ---------------------------------------------------------------------------

def active_epoch_id(completed: dict[int, Completion]) -> Optional[int]:
    """First epoch that is not complete, or None when all six are complete."""
    for e in EPOCH_DEFS:
        if e.id not in completed:
            return e.id
    return None


def can_complete(epoch_id: int, completed: dict[int, Completion]) -> bool:
    if epoch_id not in EPOCH_IDS or epoch_id in completed:
        return False
    return all(i in completed for i in EPOCH_IDS if i < epoch_id)


def assert_can_complete(epoch_id: int, completed: dict[int, Completion], completion: Completion) -> None:
    if epoch_id in completed:
        raise EpochOrderError(f"Epoch {epoch_id} is already complete; completion is permanent")
    if not can_complete(epoch_id, completed):
        raise EpochOrderError(f"Epoch {epoch_id} cannot complete before every earlier epoch is complete")
    prev = completed.get(epoch_id - 1)
    if prev is not None and completion.completed_at < prev.completed_at:
        raise EpochOrderError(f"Epoch {epoch_id} evidence predates epoch {epoch_id - 1}'s completion")


def derive_statuses(completed: dict[int, Completion]) -> list[dict]:
    """Status per epoch. Exactly one epoch is `active` unless all are complete."""
    gaps = [i for i in completed if not all(j in completed for j in EPOCH_IDS if j < i)]
    if gaps:
        raise EpochOrderError(f"Stored completions are out of order: {sorted(gaps)}")
    active = active_epoch_id(completed)
    out = []
    for e in EPOCH_DEFS:
        if e.id in completed:
            status = "complete"
        elif e.id == active:
            status = "active"
        else:
            status = "locked"
        out.append({"id": e.id, "key": e.key, "name": e.name, "anchor": e.anchor, "status": status})
    return out


# ---------------------------------------------------------------------------
# Proof validation
# ---------------------------------------------------------------------------

_TX_HASH = re.compile(r"^0x[0-9a-f]{64}$")
_ADDRESS = re.compile(r"^0x[0-9a-fA-F]{40}$")


def tx_proof(tx_hash: str, blockscout_base: str, **extra) -> dict:
    h = tx_hash.lower()
    return {"type": "tx", "hash": h, "url": f"{blockscout_base.rstrip('/')}/tx/{h}", **extra}


def validate_proof(
    epoch_id: int,
    proof: Optional[dict],
    *,
    blockscout_base: str,
    known_run_ids: Iterable[int] = (),
    github_repo: str = "",
    release_tag: str = "",
) -> None:
    """Raise InvalidProofError unless `proof` is acceptable evidence for `epoch_id`."""
    if not isinstance(proof, dict) or not proof:
        raise InvalidProofError(f"Epoch {epoch_id}: proof is required")

    if epoch_id in MODEL_EPOCHS:
        if proof.get("type") != "model_run":
            raise InvalidProofError(f"Epoch {epoch_id}: expected a model_run proof")
        run_id = proof.get("run_id")
        if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id not in set(known_run_ids):
            raise InvalidProofError(f"Epoch {epoch_id}: run_id {run_id!r} is not a stored model run")
        if epoch_id == 2 and not isinstance(proof.get("methodology"), dict):
            raise InvalidProofError("Epoch 2: a methodology.json snapshot is required")
        return

    if epoch_id in TX_EPOCHS:
        h = proof.get("hash")
        if proof.get("type") != "tx" or not isinstance(h, str) or not _TX_HASH.match(h):
            raise InvalidProofError(f"Epoch {epoch_id}: expected a tx proof with a 0x-prefixed 32-byte lowercase hash")
        if proof.get("url") != f"{blockscout_base.rstrip('/')}/tx/{h}":
            raise InvalidProofError(f"Epoch {epoch_id}: proof url must point to this tx on Blockscout")
        if epoch_id == 5:
            token = proof.get("token_address")
            if not isinstance(token, str) or not _ADDRESS.match(token):
                raise InvalidProofError("Epoch 5: the launched token address is required")
        return

    if epoch_id in RELEASE_EPOCHS:
        expected = f"https://github.com/{github_repo}/releases/tag/{release_tag}"
        if proof.get("type") != "release" or not github_repo or proof.get("url") != expected:
            raise InvalidProofError(f"Epoch {epoch_id}: expected release proof {expected}")
        return

    raise InvalidProofError(f"Unknown epoch {epoch_id}")


# ---------------------------------------------------------------------------
# Progress and live status (model is the serialize_model_run() dict)
# ---------------------------------------------------------------------------

def epoch1_met(model: dict, gates_config: dict) -> bool:
    return model["n"] >= gates_config["n_samples_min"]


def epoch2_met(model: dict, target_auc: float) -> bool:
    return model["proven_floor"] >= target_auc and not model["blocked_by"]


def progress_for(epoch_id: int, model: Optional[dict], gates_config: dict, target_auc: float) -> Optional[dict]:
    if model is None:
        return None
    if epoch_id == 1:
        return {"current": model["n"], "target": gates_config["n_samples_min"], "unit": "samples", "run_id": model["run_id"]}
    if epoch_id == 2:
        return {
            "current": model["proven_floor"],
            "target": target_auc,
            "unit": "proven_floor",
            "jar_level": model["jar_level"],
            "gates": model["gates"],
            "blocked_by": model["blocked_by"],
            "run_id": model["run_id"],
        }
    return None


def golem_paused(model: Optional[dict], completed: dict[int, Completion], target_auc: float) -> Optional[str]:
    """
    After Epoch II is (permanently) complete, the live model can still regress. Golem must not trade then.
    Returns the failing gate name (or "proven_floor"), else None. Before Epoch II, Golem is not trading at all.
    """
    if 2 not in completed:
        return None
    if model is None:
        return "no_model_run"
    if model["blocked_by"]:
        return model["blocked_by"]
    if model["proven_floor"] < target_auc:
        return "proven_floor"
    return None


# ---------------------------------------------------------------------------
# Onchain evidence selection
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ChainEvent:
    tx_hash: str
    block: int
    log_index: int
    at: datetime
    data: dict = field(default_factory=dict)


def first_event_after(events: Iterable[ChainEvent], not_before: Optional[datetime]) -> Optional[ChainEvent]:
    """Earliest event (block, log order) at or after `not_before`."""
    for ev in sorted(events, key=lambda e: (e.block, e.log_index)):
        if not_before is None or ev.at >= not_before:
            return ev
    return None


def agent_signed_launches(launcher_events: Iterable[ChainEvent], agent: str) -> list[ChainEvent]:
    """
    EpochLauncher only emits Launched after verifying an EIP-712 signature from its current `agent`.
    Replaying AgentUpdated in log order tells us which key signed each launch; keep the ones signed by `agent`.
    """
    agent = agent.lower()
    current = None
    out = []
    for ev in sorted(launcher_events, key=lambda e: (e.block, e.log_index)):
        kind = ev.data.get("kind")
        if kind == "agent_updated":
            current = (ev.data.get("new_agent") or "").lower()
        elif kind == "launched" and current == agent:
            out.append(ev)
    return out
