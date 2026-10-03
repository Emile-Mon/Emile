import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import numpy as np
import pandas as pd
from app.core.config import settings
from app.ml.features import extract_features
from app.ml.jar_math import calculate_epsilon_vc, evaluate_jar_level, gate_thresholds


def _perfect_preds(n_pos: int, n_neg: int):
    y_true = np.array([1] * n_pos + [0] * n_neg)
    y_pred = np.array([0.9] * n_pos + [0.1] * n_neg)
    return y_true, y_pred


def _evaluate(**overrides):
    y_true, y_pred = _perfect_preds(100, 100)
    kwargs = dict(
        auc_mean=0.75, auc_std=0.01, n_samples=200, n_positive=100,
        y_true=y_true, y_pred_proba=y_pred, time_split_gap=0.01,
    )
    kwargs.update(overrides)
    return evaluate_jar_level(**kwargs)


class TestJarMath(unittest.TestCase):
    def test_vc_epsilon_calculation(self):
        eps = calculate_epsilon_vc(340, 28)
        self.assertTrue(0.0 < eps < 1.0)

    def test_vc_epsilon_matches_brief_audit(self):
        # Brief open question #1: n=1,570, d=28 must give epsilon ~0.32, not 0.042
        self.assertAlmostEqual(calculate_epsilon_vc(1570, 28), 0.324, places=3)

    def test_epsilon_defaults_to_configured_capacity(self):
        self.assertEqual(calculate_epsilon_vc(5000), calculate_epsilon_vc(5000, settings.CAPACITY_D))

    def test_evaluate_jar_level_gates_failure(self):
        res = _evaluate()
        self.assertFalse(res["gates"]["n_samples"])
        self.assertEqual(res["blocked_by"], "n_samples")
        self.assertLessEqual(res["jar_level"], settings.JAR_GATE_CAP)

    def test_proven_floor_is_min_of_vc_and_bootstrap(self):
        res = _evaluate()
        self.assertEqual(res["proven_floor"], min(res["floor_vc"], res["auc_boot_lower"]))

    def test_jar_is_driven_by_proven_floor_not_auc(self):
        # High AUC but a small sample: VC penalty pushes the floor below chance, so the jar stays empty
        res = _evaluate(auc_mean=0.95)
        self.assertLess(res["proven_floor"], settings.AUC_FLOOR)
        self.assertEqual(res["raw_jar_level"], 0.0)
        self.assertEqual(res["jar_level"], 0.0)

    def test_jar_formula(self):
        res = _evaluate(n_samples=200_000, n_positive=60_000, auc_mean=0.58)
        expected = np.clip((res["proven_floor"] - settings.AUC_FLOOR) / (settings.AUC_TARGET - settings.AUC_FLOOR), 0, 1)
        self.assertAlmostEqual(res["raw_jar_level"], float(expected), places=3)

    def test_gates_use_configured_thresholds(self):
        t = gate_thresholds()
        at_min = _evaluate(n_samples=t["n_samples_min"], n_positive=t["n_positive_min"])
        self.assertTrue(at_min["gates"]["n_samples"])
        self.assertTrue(at_min["gates"]["n_positive"])
        below = _evaluate(n_samples=t["n_samples_min"] - 1, n_positive=t["n_positive_min"] - 1)
        self.assertFalse(below["gates"]["n_samples"])
        self.assertFalse(below["gates"]["n_positive"])
        self.assertFalse(_evaluate(auc_std=t["auc_std_max"])["gates"]["auc_std"])
        self.assertFalse(_evaluate(time_split_gap=t["time_split_gap_max"] + 0.001)["gates"]["time_split"])

    def test_capacity_d_matches_feature_matrix(self):
        n = 40
        df = pd.DataFrame({
            "launch_hour_utc": [float(i % 24) for i in range(n)],
            "launched_at": pd.date_range("2026-09-01", periods=n, freq="h", tz="UTC"),
            "holders": [float(i) for i in range(n)],
            "lore": ["a small lore line"] * (n - 1) + [None],
            "name": ["Token Name"] * n,
        })
        X, _ = extract_features(df)
        self.assertEqual(X.shape[1], settings.CAPACITY_D)


if __name__ == "__main__":
    unittest.main()
