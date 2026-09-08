import unittest
import numpy as np
from app.ml.jar_math import calculate_epsilon_vc, evaluate_jar_level

class TestJarMath(unittest.TestCase):
    def test_vc_epsilon_calculation(self):
        eps = calculate_epsilon_vc(340, 28)
        self.assertTrue(0.0 < eps < 1.0)

    def test_evaluate_jar_level_gates_failure(self):
        y_true = np.array([1]*100 + [0]*100)
        y_pred = np.array([0.9]*100 + [0.1]*100)

        res = evaluate_jar_level(
            auc_mean=0.75,
            auc_std=0.01,
            n_samples=200,
            n_positive=100,
            y_true=y_true,
            y_pred_proba=y_pred,
            time_split_gap=0.01,
            d=28
        )

        self.assertFalse(res["gates"]["n_samples"])
        self.assertEqual(res["blocked_by"], "n_samples")
        self.assertLessEqual(res["jar_level"], 0.95)

if __name__ == "__main__":
    unittest.main()
