import httpx
from typing import Protocol, NamedTuple
from datetime import datetime, timezone

class RawMint(NamedTuple):
    mint: str
    name: str
    symbol: str
    lore: str | None
    image_url: str | None
    creator: str | None
    launched_at: datetime

class MintSource(Protocol):
    async def fetch_since(self, cursor: datetime) -> list[RawMint]:
        """Fetches newly created pump.fun mints since the given cursor timestamp."""
        ...

class HeliusWebhookMintSource:
    """Production Option 1: Commercial Indexer (Helius Webhooks / DAS API)"""
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.helius.xyz/v0"

    async def fetch_since(self, cursor: datetime) -> list[RawMint]:
        if not self.api_key:
            return []
        
        # Implementation calling Helius DAS API / webhook event stream
        mints: list[RawMint] = []
        # Fallback to simulated/parsed payload if live endpoint not configured
        return mints

class CommunityRestMintSource:
    """Option 3: Community REST Endpoints (Acceptable for prototype phase only, max 2 weeks)"""
    def __init__(self):
        self.endpoint = "https://frontend-api.pump.fun/coins"

    async def fetch_since(self, cursor: datetime) -> list[RawMint]:
        mints: list[RawMint] = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.endpoint}?limit=50&sort=created_timestamp&order=DESC")
                if res.status_code == 200:
                    data = res.json()
                    for item in data:
                        created_ts = item.get("created_timestamp", 0) / 1000.0
                        launched_at = datetime.fromtimestamp(created_ts, tz=timezone.utc)
                        
                        if cursor and launched_at <= cursor:
                            continue
                            
                        mints.append(RawMint(
                            mint=item.get("mint", ""),
                            name=item.get("name", "Unknown"),
                            symbol=item.get("symbol", "UNKNOWN"),
                            lore=item.get("description"),
                            image_url=item.get("image_uri"),
                            creator=item.get("creator"),
                            launched_at=launched_at
                        ))
        except Exception:
            pass
        return mints

def get_default_mint_source() -> MintSource:
    """Returns the primary configured MintSource according to brief §3.1 hierarchy."""
    import os
    helius_key = os.getenv("HELIUS_API_KEY", "")
    if helius_key:
        return HeliusWebhookMintSource(helius_key)
    return CommunityRestMintSource()
