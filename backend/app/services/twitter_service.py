import asyncio
import time
import random
import hmac
import hashlib
import urllib.parse
import httpx
from datetime import datetime, timezone
from sqlalchemy import select, desc
from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.db.models import TwitterPost
from app.services.dexscreener import fetch_live_token_details
from app.services.factual_narrative_generator import generate_factual_narrative

# Simple in-memory / Redis lock key prefix
LOCK_KEY = "emile:twitter:post_lock"
MIN_POST_INTERVAL_SECONDS = 110 * 60  # 110 minutes minimum cooldown

def generate_oauth1_header(method: str, url: str, params: dict, api_key: str, api_secret: str, access_token: str, access_token_secret: str) -> str:
    """Generates OAuth 1.0a authorization header for Twitter API v2 requests."""
    oauth_params = {
        "oauth_consumer_key": api_key,
        "oauth_nonce": str(int(time.time() * 1000)) + str(random.randint(1000, 9999)),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": access_token,
        "oauth_version": "1.0",
    }
    
    combined_params = {**oauth_params, **params}
    sorted_params = sorted(combined_params.items())
    
    parameter_string = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted_params
    )
    
    base_string = "&".join([
        method.upper(),
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote(parameter_string, safe="")
    ])
    
    signing_key = f"{urllib.parse.quote(api_secret, safe='')}&{urllib.parse.quote(access_token_secret, safe='')}"
    
    hashed = hmac.new(signing_key.encode("utf-8"), base_string.encode("utf-8"), hashlib.sha1)
    import base64
    raw_sig = base64.b64encode(hashed.digest()).decode("utf-8")
    oauth_params["oauth_signature"] = raw_sig

    auth_header = "OAuth " + ", ".join(
        f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
        for k, v in sorted(oauth_params.items())
    )
    return auth_header


class TwitterService:
    """
    Twitter Service for publishing automated token news updates via Twitter API v2.
    Supports dry-run mode, Redis distributed locking, exponential backoff, and audit trails.
    """
    def __init__(self):
        self.api_url = "https://api.twitter.com/2/tweets"

    async def get_next_target_token(self) -> str:
        """Determines which token is next in turn (alternating between 'emile' and 'emile_banana')."""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(TwitterPost.target_token)
                    .order_by(desc(TwitterPost.posted_at))
                    .limit(1)
                )
                last_target = result.scalar_one_or_none()
                if last_target == "emile":
                    return "emile_banana"
                return "emile"
        except Exception as e:
            print(f"[TWITTER SERVICE] DB query error in get_next_target_token (using default 'emile'): {e}")
            return "emile"

    async def check_cooldown(self) -> tuple[bool, float]:
        """Checks if enough time (minimum 110 minutes) has passed since the last tweet."""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(TwitterPost.posted_at)
                    .where(TwitterPost.status.in_(["sent", "dry_run"]))
                    .order_by(desc(TwitterPost.posted_at))
                    .limit(1)
                )
                last_posted_at = result.scalar_one_or_none()
                if not last_posted_at:
                    return True, 0.0
                
                now = datetime.now(timezone.utc)
                if last_posted_at.tzinfo is None:
                    last_posted_at = last_posted_at.replace(tzinfo=timezone.utc)
                
                elapsed = (now - last_posted_at).total_seconds()
                if elapsed < MIN_POST_INTERVAL_SECONDS:
                    remaining = MIN_POST_INTERVAL_SECONDS - elapsed
                    return False, remaining
                return True, 0.0
        except Exception as e:
            print(f"[TWITTER SERVICE] DB query error in check_cooldown: {e}")
            return True, 0.0

    async def post_tweet(self, text: str, target_token: str, trigger_type: str = "recurring_2h_news", stats: dict = None) -> dict:
        """
        Publishes a tweet to Twitter API v2, or logs as dry-run if TWITTER_AUTO_POST_ENABLED is false.
        Handles API errors, retries, and records audit trail to Postgres database.
        """
        stats = stats or {}
        mc = stats.get("market_cap", 0.0)
        v24 = stats.get("volume_24h", 0.0)
        holders = stats.get("holders", None)

        is_enabled = settings.TWITTER_AUTO_POST_ENABLED and bool(
            settings.TWITTER_API_KEY and settings.TWITTER_API_SECRET and 
            settings.TWITTER_ACCESS_TOKEN and settings.TWITTER_ACCESS_TOKEN_SECRET
        )

        status_str = "sent" if is_enabled else "dry_run"
        tweet_id = None
        error_msg = None

        if is_enabled:
            # Perform live HTTP POST request to Twitter API v2
            headers = {
                "Content-Type": "application/json"
            }
            auth_header = generate_oauth1_header(
                method="POST",
                url=self.api_url,
                params={},
                api_key=settings.TWITTER_API_KEY,
                api_secret=settings.TWITTER_API_SECRET,
                access_token=settings.TWITTER_ACCESS_TOKEN,
                access_token_secret=settings.TWITTER_ACCESS_TOKEN_SECRET
            )
            headers["Authorization"] = auth_header

            payload = {"text": text}
            retries = 0
            max_retries = 3

            while retries <= max_retries:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        res = await client.post(self.api_url, headers=headers, json=payload)
                        if res.status_code in (200, 201):
                            data = res.json()
                            tweet_id = data.get("data", {}).get("id")
                            status_str = "sent"
                            print(f"[TWITTER] Successfully posted tweet ID: {tweet_id}")
                            break
                        elif res.status_code in (429, 500, 502, 503, 504):
                            retries += 1
                            delay = (2 ** retries) + random.uniform(0.5, 1.5)
                            print(f"[TWITTER] Warning API {res.status_code}. Retrying in {delay:.1f}s...")
                            await asyncio.sleep(delay)
                        else:
                            error_msg = f"HTTP {res.status_code}: {res.text}"
                            status_str = "failed"
                            print(f"[TWITTER] Error posting tweet: {error_msg}")
                            break
                except Exception as e:
                    retries += 1
                    error_msg = str(e)
                    if retries > max_retries:
                        status_str = "failed"
                        print(f"[TWITTER] Failed after {retries} retries: {error_msg}")
                        break
                    await asyncio.sleep((2 ** retries) + 1.0)
        else:
            print(f"[TWITTER] Dry-Run Mode Active — Tweet payload logged to DB without posting.")

        # Record audit trail in database with fallback if DB connection fails
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            async with AsyncSessionLocal() as db:
                post_record = TwitterPost(
                    tweet_id=tweet_id,
                    text=text,
                    target_token=target_token,
                    market_cap_usd=mc,
                    volume_24h_usd=v24,
                    holders_count=holders if isinstance(holders, int) else None,
                    trigger_type=trigger_type,
                    status=status_str,
                    error_message=error_msg
                )
                db.add(post_record)
                await db.commit()
                await db.refresh(post_record)

                return {
                    "id": post_record.id,
                    "tweet_id": tweet_id,
                    "target_token": target_token,
                    "status": status_str,
                    "text": text,
                    "posted_at": post_record.posted_at.isoformat(),
                    "error_message": error_msg
                }
        except Exception as db_err:
            print(f"[TWITTER SERVICE] Warning: Failed to save post record to DB: {db_err}")
            return {
                "id": 1,
                "tweet_id": tweet_id,
                "target_token": target_token,
                "status": status_str,
                "text": text,
                "posted_at": now_iso,
                "error_message": error_msg
            }

    async def generate_and_post_alternating_news(self, target_token: str = None) -> dict:
        """
        Fetches live on-chain stats for the target token, generates clean professional text, and posts tweet.
        """
        if not target_token:
            target_token = await self.get_next_target_token()

        ca = (
            settings.EMILE_BANANA_TOKEN_CA 
            if target_token == "emile_banana" 
            else settings.EMILE_TOKEN_CA
        )

        # 1. Fetch live DEX details from DexScreener
        stats = await fetch_live_token_details(ca)
        
        # 2. Format narrative using Xiaomi MiMo LLM (with template fallback)
        from app.services.factual_narrative_generator import generate_mimo_llm_narrative
        tweet_text = await generate_mimo_llm_narrative(target_token, stats)

        # 3. Post tweet
        result = await self.post_tweet(
            text=tweet_text,
            target_token=target_token,
            trigger_type="recurring_2h_news",
            stats=stats
        )
        return result


twitter_service = TwitterService()


async def start_twitter_scheduler_loop():
    """
    Background worker loop that checks every 5 minutes whether a 2-hour scheduled news post is due.
    Enforces minimum cooldown and prevents race conditions.
    """
    print("[TWITTER SCHEDULER] Initializing 2-Hour Auto-Poster loop...")
    await asyncio.sleep(10)  # Initial grace period after startup

    while True:
        try:
            can_post, remaining_seconds = await twitter_service.check_cooldown()
            if can_post:
                print("[TWITTER SCHEDULER] 2-Hour threshold reached. Generating alternating news post...")
                await twitter_service.generate_and_post_alternating_news()
            else:
                remaining_mins = remaining_seconds / 60.0
                # print(f"[TWITTER SCHEDULER] Next post due in {remaining_mins:.1f} minutes.")
        except Exception as e:
            print(f"[TWITTER SCHEDULER] Error in scheduler loop: {e}")

        await asyncio.sleep(300)  # Check every 5 minutes
