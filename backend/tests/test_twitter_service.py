import os
import sys
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.factual_narrative_generator import generate_factual_narrative, format_currency
from app.services.dexscreener import fetch_live_token_details
from app.core.config import settings

def test_format_currency():
    assert format_currency(1_500_000) == "$1.50M"
    assert format_currency(25_400) == "$25.4K"
    assert format_currency(450.50) == "$450.50"
    assert format_currency(0) == "$0.00"

def test_generate_factual_narrative_emile():
    stats = {
        "mint": "0xe2e4a2404c3923990ccc1e6435dc5b6476284992",
        "market_cap": 142500,
        "volume_24h": 18340,
        "liquidity": 32100,
        "holders": 1420
    }
    tweet = generate_factual_narrative("emile", stats)
    assert "0xe2e4...4992" in tweet
    assert "$142.5K" in tweet
    assert "Automated data feed. Not financial advice." in tweet
    assert "🤖 Automated by" not in tweet

def test_generate_factual_narrative_banana():
    stats = {
        "mint": "0x3c51485b11d52f90c251e74875a8b93c81027274",
        "market_cap": 89200,
        "volume_24h": 12650,
        "liquidity": 19400,
        "holders": 980
    }
    tweet = generate_factual_narrative("emile_banana", stats)
    assert "0x3c51...7274" in tweet
    assert "$89.2K" in tweet
    assert "Automated data feed. Not financial advice." in tweet
    assert "🤖 Automated by" not in tweet

async def test_fetch_live_token_details():
    # Test fallback gracefully if network is mocked or real query runs
    stats = await fetch_live_token_details(settings.EMILE_TOKEN_CA)
    assert "mint" in stats
    assert stats["mint"] == settings.EMILE_TOKEN_CA
    assert "market_cap" in stats
    assert "volume_24h" in stats

if __name__ == "__main__":
    test_format_currency()
    test_generate_factual_narrative_emile()
    test_generate_factual_narrative_banana()
    asyncio.run(test_fetch_live_token_details())
    print("ALL TWITTER SERVICE TESTS PASSED SUCCESSFULLY!")

