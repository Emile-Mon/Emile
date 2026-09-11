import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import pandas as pd
from app.ml.features import assert_no_leakage

class TestLeakage(unittest.TestCase):
    def test_assert_no_leakage_clean(self):
        df = pd.DataFrame({
            "name": ["Token A"],
            "symbol": ["TKA"],
            "launched_at": ["2026-09-08T10:00:00Z"],
            "holders": [150],
            "lore": ["Some lore text"],
            "peak_mc": [15000.0]  # Target column, permitted
        })
        assert_no_leakage(df)

    def test_assert_no_leakage_forbidden_feature(self):
        df = pd.DataFrame({
            "name": ["Token B"],
            "volume": [50000.0]  # Forbidden feature
        })
        with self.assertRaises(ValueError):
            assert_no_leakage(df)

if __name__ == "__main__":
    unittest.main()
