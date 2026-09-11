import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.api.ideas_endpoints import calculate_confidence_label, generate_mock_cycle_data

class TestIdeasEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_confidence_label_rules(self):
        self.assertEqual(calculate_confidence_label(-0.14), "none")
        self.assertEqual(calculate_confidence_label(0.25), "weak")
        self.assertEqual(calculate_confidence_label(0.58), "provisional")
        self.assertEqual(calculate_confidence_label(0.70), "qualified")

    def test_get_current_ideas_endpoint(self):
        response = self.client.get("/api/ideas/current")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("cycle_id", data)
        self.assertIn("candidates", data)
        self.assertEqual(len(data["candidates"]), 100)
        
        # Check candidates ordering (rank 1 to 100, scores descending)
        candidates = data["candidates"]
        for i in range(len(candidates) - 1):
            self.assertGreaterEqual(candidates[i]["score"], candidates[i+1]["score"])
            self.assertEqual(candidates[i]["rank"], i + 1)
            self.assertIn("commitment", candidates[i])
            self.assertEqual(len(candidates[i]["commitment"]), 64)

    def test_get_eliminated_endpoint(self):
        response = self.client.get("/api/ideas/eliminated")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("name", data[0])
        self.assertIn("led_cycle", data[0])

    def test_get_exclusions_endpoint(self):
        response = self.client.get("/api/ideas/exclusions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("deployed_mint", data[0])
        self.assertIn("deployer", data[0])

    def test_get_generator_source_endpoint(self):
        response = self.client.get("/api/ideas/generator")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("generator_sha", data)
        self.assertIn("source", data)
        self.assertIn("generate_cycle", data["source"])

    def test_get_filter_rules_endpoint(self):
        response = self.client.get("/api/ideas/filter")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("active_rules", data)
        self.assertGreater(len(data["active_rules"]), 0)

if __name__ == "__main__":
    unittest.main()
