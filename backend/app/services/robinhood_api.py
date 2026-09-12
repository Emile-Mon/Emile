import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

ROBINHOOD_API_BASE = "https://api.robinhood.com/rhj"

class RobinhoodStockTokenService:
    """
    Service to interact with official Robinhood Stock Token APIs (https://api.robinhood.com/rhj/).
    Documentation: https://docs.robinhood.com/chain/stock-token-apis/
    """
    def __init__(self, base_url: str = ROBINHOOD_API_BASE):
        self.base_url = base_url.rstrip("/")
        self._assets_cache: Optional[List[Dict[str, Any]]] = None
        self._assets_cache_time: float = 0.0

    async def fetch_assets(self) -> List[Dict[str, Any]]:
        """
        GET /rhj/assets
        Fetches asset metadata for Stock Tokens, including current multiplier, logoUrl, and deployments.
        """
        url = f"{self.base_url}/assets"
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    assets = data.get("assets") or []
                    self._assets_cache = assets
                    return assets
                else:
                    logger.warning(f"Robinhood /assets API returned status {res.status_code}")
        except Exception as e:
            logger.error(f"Error fetching Robinhood /assets: {e}")
        return self._assets_cache or []

    async def fetch_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        GET /rhj/prices/{symbol}
        Fetches live token-denominated USD bid/ask and applies currentMultiplier if available.
        """
        clean_symbol = symbol.upper().replace("X", "")
        url = f"{self.base_url}/prices/{clean_symbol}"
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    quotes = data.get("quotes") or []
                    if quotes:
                        quote = quotes[0]
                        # Find multiplier from asset metadata
                        multiplier = 1.0
                        assets = await self.fetch_assets()
                        asset = next((a for a in assets if a.get("tokenSymbol") == quote.get("tokenSymbol")), None)
                        if asset and asset.get("currentMultiplier"):
                            try:
                                multiplier = float(asset.get("currentMultiplier"))
                            except (ValueError, TypeError):
                                multiplier = 1.0
                        
                        raw_bid = float(quote.get("bid") or 0.0)
                        raw_ask = float(quote.get("ask") or 0.0)

                        quote["effective_bid"] = raw_bid * multiplier
                        quote["effective_ask"] = raw_ask * multiplier
                        quote["multiplier"] = multiplier
                        if asset:
                            quote["logo_url"] = asset.get("logoUrl")
                            quote["token_name"] = asset.get("tokenName")
                            quote["trading_capabilities"] = asset.get("tradingCapabilities")

                        return quote
        except Exception as e:
            logger.error(f"Error fetching Robinhood /prices/{clean_symbol}: {e}")
        return None

    async def fetch_corporate_actions(self) -> List[Dict[str, Any]]:
        """
        GET /rhj/corporate-actions
        Fetches processed corporate actions (stock splits, dividends, mergers).
        """
        url = f"{self.base_url}/corporate-actions"
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("corpActions") or []
        except Exception as e:
            logger.error(f"Error fetching Robinhood /corporate-actions: {e}")
        return []
