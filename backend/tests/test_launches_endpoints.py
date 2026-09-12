import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestLaunchesEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_preparing_launch_endpoint(self):
        response = self.client.get("/api/launches/preparing")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("name", data)
        self.assertIn("predicted_prob", data)
        self.assertIn("contributions", data)
        self.assertEqual(data["status"], "preparing_launch")
        self.assertIsInstance(data["contributions"], list)

    def test_submit_ca_endpoint(self):
        payload = {
            "launch_id": 7,
            "mint": "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
            "deploy_tx": "0x1111222233334444"
        }
        response = self.client.post("/api/launches/submit-ca", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data["ok"])
        self.assertEqual(data["mint"], payload["mint"])
        self.assertEqual(data["status"], "pending_48h")

    def test_get_all_launches_endpoint(self):
        response = self.client.get("/api/launches")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("day_index", data[0])
        self.assertIn("predicted_prob", data[0])

    def test_get_launches_calibration_endpoint(self):
        response = self.client.get("/api/launches/calibration")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("brier_score", data)
        self.assertIn("launches_total", data)
        self.assertIn("calibration_direction", data)

    def test_get_pending_launch_endpoint(self):
        response = self.client.get("/api/launches/pending")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("predicted_prob", data)

if __name__ == "__main__":
    unittest.main()
