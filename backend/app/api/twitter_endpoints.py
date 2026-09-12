from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone

from app.core.config import settings
from app.db.database import get_db
from app.db.models import TwitterPost
from app.services.twitter_service import twitter_service
from app.services.dexscreener import fetch_live_token_details
from app.services.factual_narrative_generator import generate_factual_narrative

router = APIRouter(prefix="/api/twitter", tags=["twitter"])

@router.get("/status")
async def get_twitter_status(db: AsyncSession = Depends(get_db)):
    """
    Returns current Twitter automation configuration, API connection state,
    dry-run indicator, next token turn, and timestamp of the last post.
    """
    next_token = await twitter_service.get_next_target_token()
    can_post, remaining_seconds = await twitter_service.check_cooldown()

    # Get last post
    result = await db.execute(
        select(TwitterPost)
        .order_by(desc(TwitterPost.posted_at))
        .limit(1)
    )
    last_post = result.scalar_one_or_none()

    is_credentials_configured = bool(
        settings.TWITTER_API_KEY and 
        settings.TWITTER_API_SECRET and 
        settings.TWITTER_ACCESS_TOKEN and 
        settings.TWITTER_ACCESS_TOKEN_SECRET
    )

    return {
        "auto_post_enabled": settings.TWITTER_AUTO_POST_ENABLED,
        "is_configured": is_credentials_configured,
        "mode": "live" if (settings.TWITTER_AUTO_POST_ENABLED and is_credentials_configured) else "dry_run",
        "post_interval_hours": settings.TWITTER_POST_INTERVAL_HOURS,
        "managed_by_handle": settings.TWITTER_MANAGED_BY_HANDLE,
        "next_target_token": next_token,
        "emile_ca": settings.EMILE_TOKEN_CA,
        "emile_banana_ca": settings.EMILE_BANANA_TOKEN_CA,
        "can_post_now": can_post,
        "cooldown_remaining_seconds": max(0, int(remaining_seconds)),
        "last_post": {
            "id": last_post.id,
            "target_token": last_post.target_token,
            "status": last_post.status,
            "posted_at": last_post.posted_at.isoformat(),
            "text": last_post.text
        } if last_post else None
    }

@router.get("/preview")
async def get_tweet_preview(target_token: str = Query("emile", enum=["emile", "emile_banana"])):
    """
    Fetches real live DEX stats and returns formatted factual tweet preview.
    """
    ca = settings.EMILE_BANANA_TOKEN_CA if target_token == "emile_banana" else settings.EMILE_TOKEN_CA
    stats = await fetch_live_token_details(ca)
    tweet_text = generate_factual_narrative(target_token, stats)

    return {
        "target_token": target_token,
        "ca": ca,
        "stats": stats,
        "tweet_text": tweet_text,
        "managed_by_handle": settings.TWITTER_MANAGED_BY_HANDLE
    }

@router.post("/post-news-now")
async def trigger_news_post(
    target_token: str = Query(None, enum=["emile", "emile_banana"]),
    force: bool = Query(False, description="Bypass minimum cooldown timer if true")
):
    """
    Triggers an immediate factual token news tweet for the specified or next alternating token.
    """
    if not force:
        can_post, remaining_seconds = await twitter_service.check_cooldown()
        if not can_post:
            remaining_mins = int(remaining_seconds // 60)
            raise HTTPException(
                status_code=429,
                detail=f"Cooldown active. Next scheduled post is due in {remaining_mins} minutes. Use ?force=true to bypass."
            )

    result = await twitter_service.generate_and_post_alternating_news(target_token=target_token)
    return {
        "success": True,
        "result": result
    }

@router.get("/history")
async def get_post_history(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists past tweet publication logs and audit trail.
    """
    result = await db.execute(
        select(TwitterPost)
        .order_by(desc(TwitterPost.posted_at))
        .limit(limit)
    )
    posts = result.scalars().all()

    return {
        "count": len(posts),
        "posts": [
            {
                "id": p.id,
                "tweet_id": p.tweet_id,
                "target_token": p.target_token,
                "text": p.text,
                "status": p.status,
                "market_cap_usd": float(p.market_cap_usd) if p.market_cap_usd is not None else None,
                "volume_24h_usd": float(p.volume_24h_usd) if p.volume_24h_usd is not None else None,
                "holders_count": p.holders_count,
                "trigger_type": p.trigger_type,
                "posted_at": p.posted_at.isoformat(),
                "error_message": p.error_message
            }
            for p in posts
        ]
    }
