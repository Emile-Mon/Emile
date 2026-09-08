import unittest
from app.services.lore_safety import sanitize_lore, strip_zero_width_and_bidi, strip_urls

class TestLoreSafety(unittest.TestCase):
    def test_strip_zero_width_and_bidi(self):
        raw = "Hello\u200BWorld\u200ETest"
        self.assertEqual(strip_zero_width_and_bidi(raw), "HelloWorldTest")

    def test_strip_urls(self):
        raw = "Check out https://scam-site.com or ipfs://QmX123 for details"
        self.assertEqual(strip_urls(raw), "Check out  or  for details")

    def test_sanitize_lore_profanity(self):
        raw = "This is a retard coin"
        display, withheld, reason = sanitize_lore(raw)
        self.assertEqual(display, "")
        self.assertTrue(withheld)
        self.assertEqual(reason, "profanity")

    def test_sanitize_lore_clean(self):
        raw = "Rescued from a dead Discord in 2021. https://link.com"
        display, withheld, reason = sanitize_lore(raw)
        self.assertEqual(display, "Rescued from a dead Discord in 2021.")
        self.assertFalse(withheld)
        self.assertIsNone(reason)

if __name__ == "__main__":
    unittest.main()
