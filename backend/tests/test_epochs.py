import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import unittest
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.api.epochs_endpoints import build_epochs_payload
from app.services import epoch_indexer
from app.services.chain_reader import (
    TOPIC_AGENT_UPDATED, TOPIC_LAUNCHED, TOPIC_TRANSFER, address_topic,
    decode_agent_updated, decode_launched, decode_transfer, topic_to_address,
)
from app.services.epochs import (
    EPOCH_DEFS, ChainEvent, Completion, EpochOrderError, InvalidProofError,
    active_epoch_id, agent_signed_launches, assert_can_complete, can_complete, derive_statuses,
    first_event_after, golem_paused, progress_for, tx_proof, validate_proof,
)

BS = "https://robinhoodchain.blockscout.com"
T0 = datetime(2026, 10, 3, tzinfo=timezone.utc)
HASH = "0x" + "ab" * 32
GATES = {"n_samples_min": 2000, "n_positive_min": 200, "auc_std_max": 0.05, "time_split_gap_max": 0.04}


def done(*ids, start=T0):
    return {i: Completion({"type": "model_run", "run_id": i}, start + timedelta(hours=i)) for i in ids}


def model(**kw):
    m = {"run_id": 7, "n": 1570, "n_positive": 400, "proven_floor": 0.31, "jar_level": 0.0,
         "gates": {"n_samples": False}, "blocked_by": "n_samples"}
    m.update(kw)
    return m


class TestOrdering(unittest.TestCase):
    def test_six_epochs_in_order(self):
        self.assertEqual([e.id for e in EPOCH_DEFS], [1, 2, 3, 4, 5, 6])
        self.assertEqual(EPOCH_DEFS[3].anchor, "first-burn")

    def test_exactly_one_active(self):
        for n in range(6):
            statuses = [e["status"] for e in derive_statuses(done(*range(1, n + 1)))]
            self.assertEqual(statuses.count("active"), 1)
            self.assertEqual(statuses.index("active"), n)
            self.assertEqual(statuses[:n], ["complete"] * n)
            self.assertEqual(statuses[n + 1:], ["locked"] * (5 - n))

    def test_all_complete_has_no_active(self):
        completed = done(1, 2, 3, 4, 5, 6)
        self.assertIsNone(active_epoch_id(completed))
        self.assertNotIn("active", [e["status"] for e in derive_statuses(completed)])

    def test_cannot_skip_an_epoch(self):
        self.assertFalse(can_complete(3, done(1)))
        self.assertTrue(can_complete(2, done(1)))
        with self.assertRaises(EpochOrderError):
            assert_can_complete(3, done(1), Completion({}, T0 + timedelta(days=1)))

    def test_stored_gap_is_rejected(self):
        with self.assertRaises(EpochOrderError):
            derive_statuses(done(1, 3))

    def test_evidence_must_postdate_previous_epoch(self):
        completed = done(1, 2)
        early = Completion({}, completed[2].completed_at - timedelta(seconds=1))
        with self.assertRaises(EpochOrderError):
            assert_can_complete(3, completed, early)


class TestPermanence(unittest.TestCase):
    def test_complete_cannot_be_recompleted(self):
        with self.assertRaises(EpochOrderError):
            assert_can_complete(2, done(1, 2), Completion({}, T0 + timedelta(days=9)))

    def test_floor_drop_keeps_epoch2_complete_and_pauses_golem(self):
        completed = done(1, 2)
        regressed = model(n=2500, proven_floor=0.55, blocked_by=None)
        payload = build_epochs_payload(completed, regressed, {"total_wei": "0", "count": 0})
        self.assertEqual(payload["epochs"][1]["status"], "complete")
        self.assertEqual(payload["golem_paused"], "proven_floor")
        self.assertEqual(golem_paused(model(blocked_by="auc_std"), completed, 0.60), "auc_std")
        self.assertIsNone(golem_paused(model(proven_floor=0.62, blocked_by=None), completed, 0.60))

    def test_no_pause_before_epoch2(self):
        self.assertIsNone(golem_paused(model(), done(1), 0.60))


class TestProofValidation(unittest.TestCase):
    def test_valid_proofs(self):
        validate_proof(1, {"type": "model_run", "run_id": 7}, blockscout_base=BS, known_run_ids=[7])
        validate_proof(2, {"type": "model_run", "run_id": 7, "methodology": {"capacity_d": 37}},
                       blockscout_base=BS, known_run_ids=[7])
        validate_proof(3, tx_proof(HASH, BS), blockscout_base=BS)
        validate_proof(5, tx_proof(HASH, BS, token_address="0x" + "1" * 40), blockscout_base=BS)
        validate_proof(6, {"type": "release", "url": "https://github.com/epochlabs/golem/releases/tag/golem-v1"},
                       blockscout_base=BS, github_repo="epochlabs/golem", release_tag="golem-v1")

    def test_tx_proof_url_points_to_blockscout_tx(self):
        p = tx_proof(HASH.upper().replace("0X", "0x"), BS)
        self.assertEqual(p["url"], f"{BS}/tx/{HASH}")

    def test_invalid_proofs(self):
        bad = [
            (1, None, {}),
            (1, {}, {}),
            (1, {"type": "model_run", "run_id": 99}, {"known_run_ids": [7]}),
            (1, {"type": "model_run", "run_id": True}, {"known_run_ids": [1]}),
            (2, {"type": "model_run", "run_id": 7}, {"known_run_ids": [7]}),  # no methodology snapshot
            (3, {"type": "tx", "hash": "0x123", "url": f"{BS}/tx/0x123"}, {}),
            (3, {"type": "tx", "hash": HASH, "url": f"https://etherscan.io/tx/{HASH}"}, {}),
            (4, {"type": "model_run", "run_id": 7}, {"known_run_ids": [7]}),
            (5, tx_proof(HASH, BS), {}),  # missing token address
            (6, {"type": "release", "url": "https://github.com/x/y/releases/tag/golem-v1"},
             {"github_repo": "epochlabs/golem", "release_tag": "golem-v1"}),
            (6, {"type": "release", "url": "https://github.com//releases/tag/"}, {}),  # repo not configured
        ]
        for epoch_id, proof, kw in bad:
            with self.subTest(epoch=epoch_id, proof=proof):
                with self.assertRaises(InvalidProofError):
                    validate_proof(epoch_id, proof, blockscout_base=BS, **kw)


class TestProgress(unittest.TestCase):
    def test_epoch1_progress_uses_model_run_numbers(self):
        m = model()
        self.assertEqual(progress_for(1, m, GATES, 0.60),
                         {"current": 1570, "target": 2000, "unit": "samples", "run_id": 7})

    def test_epoch2_progress_mirrors_state_fields(self):
        m = model(proven_floor=0.48, jar_level=0.0)
        p = progress_for(2, m, GATES, 0.60)
        for k_payload, k_model in [("current", "proven_floor"), ("jar_level", "jar_level"),
                                   ("gates", "gates"), ("blocked_by", "blocked_by"), ("run_id", "run_id")]:
            self.assertEqual(p[k_payload], m[k_model])

    def test_onchain_epochs_have_no_progress(self):
        for i in (3, 4, 5, 6):
            self.assertIsNone(progress_for(i, model(), GATES, 0.60))
        self.assertIsNone(progress_for(1, None, GATES, 0.60))

    def test_payload_shape(self):
        p = build_epochs_payload(done(1), model(), {"total_wei": "0", "count": 0})
        self.assertEqual(p["active"], 2)
        self.assertEqual(len(p["epochs"]), 6)
        self.assertEqual(p["epochs"][0]["proof"], {"type": "model_run", "run_id": 1})
        self.assertIsNotNone(p["epochs"][1]["progress"])
        self.assertIsNone(p["epochs"][2]["progress"])
        self.assertEqual(p["contracts"]["chain_id"], 4663)
        self.assertEqual(p["contracts"]["launcher"], "0x75fd64Cc8D57c529f34089Ac9083E704c23F0D8B")


class TestChainEvidence(unittest.TestCase):
    # Real AgentUpdated log from the EpochLauncher deploy tx (block 78708782)
    AGENT_LOG = {
        "topics": [TOPIC_AGENT_UPDATED, "0x" + "0" * 64,
                   "0x000000000000000000000000560eb3767434006b3278810f906d7677c38914ad"],
        "data": "0x",
    }

    def test_decoders(self):
        self.assertEqual(decode_agent_updated(self.AGENT_LOG)["new_agent"], settings.GOLEM_AGENT.lower())
        self.assertEqual(topic_to_address(address_topic(settings.GOLEM_WALLET)), settings.GOLEM_WALLET.lower())
        t = decode_transfer({"topics": [TOPIC_TRANSFER, address_topic("0x" + "a" * 40), address_topic("0x" + "b" * 40)],
                             "data": hex(10 ** 18)})
        self.assertEqual((t["from"], t["to"], t["amount_wei"]), ("0x" + "a" * 40, "0x" + "b" * 40, 10 ** 18))
        caller = "c" * 40
        words = ["00" * 32] * 2 + [format(6120, "064x"), format(5, "064x"), format(7, "064x"), caller.rjust(64, "0")]
        launched = decode_launched({"topics": [TOPIC_LAUNCHED, address_topic("0x" + "1" * 40),
                                               address_topic("0x" + "2" * 40), "0x" + "33" * 32],
                                    "data": "0x" + "".join(words)})
        self.assertEqual(launched["token"], "0x" + "1" * 40)
        self.assertEqual(launched["proven_floor_bps"], 6120)
        self.assertEqual(launched["caller"], "0x" + caller)

    def test_only_launches_signed_by_golem_agent_count(self):
        agent, other = settings.GOLEM_AGENT.lower(), "0x" + "9" * 40
        ev = lambda b, kind, **d: ChainEvent(f"0x{b:064x}", b, 0, T0 + timedelta(minutes=b), {"kind": kind, **d})
        events = [
            ev(1, "agent_updated", new_agent=agent),
            ev(2, "launched", token="0x" + "1" * 40),
            ev(3, "agent_updated", new_agent=other),
            ev(4, "launched", token="0x" + "2" * 40),
            ev(5, "agent_updated", new_agent=agent),
            ev(6, "launched", token="0x" + "3" * 40),
        ]
        signed = agent_signed_launches(events, settings.GOLEM_AGENT)
        self.assertEqual([e.block for e in signed], [2, 6])
        # Launch 2 predates the previous epoch, so the first valid one is launch 6
        self.assertEqual(first_event_after(signed, T0 + timedelta(minutes=3)).block, 6)
        self.assertIsNone(first_event_after(signed, T0 + timedelta(days=1)))


class _FakeDB:
    def __init__(self):
        self.rows = []

    async def execute(self, stmt, params=None):
        self.rows.append(params)


class _FakeReader:
    def __init__(self, txs):
        self.txs = txs

    async def get_logs(self, frm, to, *, address=None, topics=None):
        return [{"transactionHash": h} for h in self.txs]

    async def transactions_with_receipts(self, hashes):
        return {h: self.txs[h] for h in hashes}

    async def block_timestamps(self, blocks):
        return {b: T0 for b in blocks}


class TestSwapIndexer(unittest.TestCase):
    def test_only_successful_wallet_to_router_txs(self):
        wallet, router = settings.GOLEM_WALLET.lower(), settings.UNISWAP_V2_ROUTER.lower()
        ok = ({"from": wallet, "to": router}, {"status": "0x1", "blockNumber": "0x10"})
        txs = {
            "0x" + "1" * 64: ok,
            "0x" + "2" * 64: ({"from": wallet, "to": router}, {"status": "0x0", "blockNumber": "0x11"}),  # reverted
            "0x" + "3" * 64: ({"from": "0x" + "f" * 40, "to": router}, {"status": "0x1", "blockNumber": "0x12"}),  # someone else
            "0x" + "4" * 64: ({"from": wallet, "to": "0x" + "e" * 40}, {"status": "0x1", "blockNumber": "0x13"}),  # not the router
        }
        db = _FakeDB()
        n = asyncio.run(epoch_indexer.index_golem_swaps(db, _FakeReader(txs), 1, 100))
        self.assertEqual(n, 1)
        self.assertEqual([(r["h"], r["b"], r["at"]) for r in db.rows], [("0x" + "1" * 64, 16, T0)])


if __name__ == "__main__":
    unittest.main()
