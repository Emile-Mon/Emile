import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from datetime import datetime, timedelta, timezone

from app.api.trades_endpoints import build_trades_payload
from app.services.chain_reader import TOPIC_TRANSFER, address_topic
from app.services.epochs import Completion
from app.services.golem_guard import trade_gate
from app.services.trade_journal import TradeRow, compute_results, decode_swap

WALLET = "0x" + "a1" * 20
ROUTER = "0x" + "b2" * 20
WETH = "0x" + "c3" * 20
PAIR = "0x" + "d4" * 20
TOKEN = "0x" + "e5" * 20
OTHER = "0x" + "f6" * 20
E = 10 ** 18
T0 = datetime(2026, 10, 3, tzinfo=timezone.utc)


def transfer(token, frm, to, amount):
    return {"address": token, "topics": [TOPIC_TRANSFER, address_topic(frm), address_topic(to)], "data": hex(amount)}


class TestDecodeSwap(unittest.TestCase):
    def test_buy_with_eth(self):
        # swapExactETHForTokens: router wraps ETH, sends WETH to the pair, pair sends tokens to the wallet
        logs = [transfer(WETH, ROUTER, PAIR, E // 2), transfer(TOKEN, PAIR, WALLET, 1000 * E)]
        self.assertEqual(decode_swap(logs, WALLET, ROUTER, WETH),
                         {"side": "buy", "token": TOKEN, "token_amount_wei": 1000 * E, "eth_amount_wei": E // 2})

    def test_sell_for_eth(self):
        # swapExactTokensForETH: wallet sends tokens to the pair, pair sends WETH to the router to unwrap
        logs = [transfer(TOKEN, WALLET, PAIR, 400 * E), transfer(WETH, PAIR, ROUTER, E // 4)]
        self.assertEqual(decode_swap(logs, WALLET, ROUTER, WETH),
                         {"side": "sell", "token": TOKEN, "token_amount_wei": 400 * E, "eth_amount_wei": E // 4})

    def test_token_for_token(self):
        logs = [transfer(TOKEN, WALLET, PAIR, 5 * E), transfer(OTHER, PAIR, WALLET, 7 * E)]
        d = decode_swap(logs, WALLET, ROUTER, WETH)
        self.assertEqual((d["side"], d["token"], d["eth_amount_wei"]), ("swap", OTHER, None))

    def test_ignores_non_transfer_logs(self):
        logs = [{"address": PAIR, "topics": ["0x" + "00" * 32], "data": "0x"},
                transfer(WETH, ROUTER, PAIR, E), transfer(TOKEN, PAIR, WALLET, 3 * E)]
        self.assertEqual(decode_swap(logs, WALLET, ROUTER, WETH)["side"], "buy")


class TestResults(unittest.TestCase):
    def test_average_cost_win_and_loss(self):
        trades = [
            TradeRow("b1", 1, "buy", TOKEN, 100, 10 * E),   # 100 @ 0.1
            TradeRow("b2", 2, "buy", TOKEN, 100, 30 * E),   # avg 0.2
            TradeRow("s1", 3, "sell", TOKEN, 50, 15 * E),   # basis 10 -> +5
            TradeRow("s2", 4, "sell", TOKEN, 150, 20 * E),  # basis 30 -> -10
        ]
        r = compute_results(trades)
        self.assertIsNone(r["b1"]["result_wei"])
        self.assertEqual(r["s1"]["result_wei"], 5 * E)
        self.assertEqual(r["s2"]["result_wei"], -10 * E)
        self.assertFalse(r["s2"]["partial_basis"])

    def test_sell_beyond_tracked_position_is_partial(self):
        r = compute_results([TradeRow("b", 1, "buy", TOKEN, 100, 10 * E), TradeRow("s", 2, "sell", TOKEN, 200, 30 * E)])
        self.assertTrue(r["s"]["partial_basis"])
        self.assertEqual(r["s"]["result_wei"], 15 * E - 10 * E)  # only the tracked half has a basis

    def test_sell_without_buy_has_no_result(self):
        r = compute_results([TradeRow("s", 1, "sell", TOKEN, 10, E)])
        self.assertIsNone(r["s"]["result_wei"])
        self.assertTrue(r["s"]["partial_basis"])

    def test_positions_are_per_token(self):
        r = compute_results([TradeRow("b", 1, "buy", TOKEN, 10, E), TradeRow("s", 2, "sell", OTHER, 10, 2 * E)])
        self.assertIsNone(r["s"]["result_wei"])


class TestTradeGate(unittest.TestCase):
    MODEL_OK = {"run_id": 9, "proven_floor": 0.62, "blocked_by": None}

    def test_locked_before_epoch2(self):
        done1 = {1: Completion({}, T0)}
        self.assertEqual(trade_gate(done1, self.MODEL_OK, 0.60).reason, "epoch_ii_not_complete")

    def test_allowed_after_epoch2_with_healthy_model(self):
        done2 = {1: Completion({}, T0), 2: Completion({}, T0 + timedelta(hours=1))}
        self.assertTrue(trade_gate(done2, self.MODEL_OK, 0.60).allowed)

    def test_paused_when_model_regresses(self):
        done2 = {1: Completion({}, T0), 2: Completion({}, T0 + timedelta(hours=1))}
        g = trade_gate(done2, {**self.MODEL_OK, "blocked_by": "auc_std"}, 0.60)
        self.assertEqual((g.allowed, g.reason), (False, "auc_std"))
        g = trade_gate(done2, {**self.MODEL_OK, "proven_floor": 0.58}, 0.60)
        self.assertEqual((g.allowed, g.reason), (False, "proven_floor"))
        self.assertEqual(trade_gate(done2, None, 0.60).reason, "no_model_run")


class TestTradesPayload(unittest.TestCase):
    def test_shape_and_join(self):
        swaps = [
            {"tx_hash": "0x01", "block": 1, "at": T0, "side": "buy", "token": TOKEN,
             "token_amount_wei": 100, "eth_amount_wei": 10 * E},
            {"tx_hash": "0x02", "block": 2, "at": T0 + timedelta(hours=1), "side": "sell", "token": TOKEN,
             "token_amount_wei": 100, "eth_amount_wei": 12 * E},
        ]
        decisions = {"0x01": {"survival_probability": 0.71, "top_signal": "holders_log", "run_id": 9}}
        p = build_trades_payload(swaps, decisions)
        self.assertEqual([t["tx_hash"] for t in p["trades"]], ["0x02", "0x01"])  # newest first
        self.assertEqual(p["trades"][1]["survival_probability"], 0.71)
        self.assertIsNone(p["trades"][0]["survival_probability"])  # no decision logged for this tx
        self.assertEqual(p["trades"][0]["result_wei"], str(2 * E))
        self.assertEqual(p["summary"], {"count": 2, "closed": 1, "wins": 1, "losses": 0, "realized_wei": str(2 * E)})
        self.assertTrue(p["trades"][0]["tx_url"].endswith("/tx/0x02"))


if __name__ == "__main__":
    unittest.main()
