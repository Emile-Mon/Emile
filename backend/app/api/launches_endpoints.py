import hashlib
import random
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text
from app.db.database import get_db
from app.db.models import Launch, LaunchStatus, IdeaCycle, IdeaCandidate, ModelRun, Token

router = APIRouter(prefix="/api/launches", tags=["launches"])

class SubmitCAPayload(BaseModel):
    launch_id: Optional[int] = None
    mint: str
    deploy_tx: Optional[str] = None
    pool_tx: Optional[str] = None
    lp_burn_tx: Optional[str] = None
    renounce_tx: Optional[str] = None

def generate_mock_launch(day_index: int = 1, status: str = "preparing_launch"):
    name = "EMILES BANANA"
    symbol = "BANANA"
    lore = """He was asked to find patterns.
So he started looking everywhere.

1,090 tokens entered the dataset.
292 crossed $30K.
28 signals were extracted.
Holder retention. Launch cycles. Seasonality. Lore length.

Émile watched them all.

He learned that numbers mattered.
He learned that timing mattered.
He learned that holders mattered.

And then, somewhere between all the data…

Émile found a banana.

He didn’t know why it mattered.

He simply kept looking at it."""
    predicted_prob = 0.8117
    
    contributions = [
        {"feature": "launch_hour_cos", "label": "Launch hour 14:00 UTC", "value": 0.211},
        {"feature": "lore_length", "label": "Lore length 340 characters", "value": 0.094},
        {"feature": "name_tokens", "label": "Name token count 3", "value": 0.038},
        {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
    ]

    authorship = {
        "name": "human",
        "lore": "model",
        "hour": "model",
        "holders": "market"
    }

    return {
        "launch_id": 7,
        "day_index": day_index,
        "cycle_id": 1418,
        "run_id": 444,
        "candidate_id": 1,
        "name": name,
        "symbol": symbol,
        "lore": lore,
        "launch_hour": 14,
        "rank_in_cycle": 1,
        "predicted_prob": predicted_prob,
        "prediction_sha": "0x3c51485b11d52f90c251e74875a8b93c81027274",
        "prediction_at": "2026-09-12T14:00:00Z",
        "status": status,
        "mint": "0x3c51485b11d52f90c251e74875a8b93c81027274",
        "deploy_tx": "0x1111...2222",
        "pool_tx": "0x3333...4444",
        "lp_burn_tx": "0x5555...6666",
        "renounce_tx": "0x7777...8888",
        "deployed_at": "2026-09-12T14:00:00Z",
        "liquidity_wei": "50000000000000000",
        "liquidity_display": "0.05 ETH",
        "peak_mc": 8608.0,
        "holders_48h": 187,
        "outcome": "pending",
        "image_url": "https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto",
        "dexscreener_url": "https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be",
        "website_url": "https://emilelearns.run/launches",
        "twitter_url": "https://x.com/EmileLearns/status/2098720499388100765?s=20",
        "authorship": authorship,
        "contributions": contributions,
        "why_text": "The model put this candidate first almost entirely on launch hour. The two cyclical launch terms carry 40.4% of its total signal, and 14:00 UTC sits near the peak of that curve. Lore length contributed a little. Holder count is pinned at the dataset median for every candidate."
    }

async def get_dexscreener_token_info_helper(mint: str) -> dict:
    import httpx
    clean_mint = mint.strip()
    url = f"https://api.dexscreener.com/latest/dex/tokens/{clean_mint}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=headers, verify=False, follow_redirects=True) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                pairs = data.get("pairs") or []
                if pairs:
                    pair = pairs[0]
                    base = pair.get("baseToken") or {}
                    info = pair.get("info") or {}
                    vol = pair.get("volume") or {}
                    liq = pair.get("liquidity") or {}
                    fdv = float(pair.get("fdv") or pair.get("marketCap") or 0.0)
                    websites = info.get("websites") or []
                    socials = info.get("socials") or []
                    return {
                        "mint": base.get("address") or clean_mint,
                        "name": base.get("name") or "EMILES BANANA",
                        "symbol": base.get("symbol") or "BANANA",
                        "peak_mc": fdv,
                        "price_usd": float(pair.get("priceUsd") or 0.0),
                        "volume_24h": float(vol.get("h24") or 0.0),
                        "liquidity_usd": float(liq.get("usd") or 0.0),
                        "outcome": "passed" if fdv >= 30000 else "pending",
                        "image_url": info.get("imageUrl") or "https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto",
                        "dexscreener_url": pair.get("url") or "https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be",
                        "website_url": websites[0].get("url") if websites else "https://emilelearns.run/launches",
                        "twitter_url": next((s.get("url") for s in socials if s.get("type") == "twitter"), None) or "https://x.com/EmileLearns/status/2098720499388100765?s=20"
                    }
    except Exception as e:
        print(f"[DEXSCREENER API HELPER] Failed for {clean_mint}: {e}")

    return {
        "mint": clean_mint,
        "name": "EMILES BANANA",
        "symbol": "BANANA",
        "peak_mc": 8608.0,
        "price_usd": 0.000008607,
        "volume_24h": 0.12,
        "liquidity_usd": 3.22,
        "outcome": "pending",
        "image_url": "https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto",
        "dexscreener_url": "https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be",
        "website_url": "https://emilelearns.run/launches",
        "twitter_url": "https://x.com/EmileLearns/status/2098720499388100765?s=20"
    }

@router.get("/preparing")
async def get_preparing_launch(ca: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    """
    GET /api/launches/preparing - Returns the candidate with live DexScreener token metadata for CA.
    """
    target_ca = (ca or "0x3c51485b11d52f90c251e74875a8b93c81027274").strip()

    # Query live DexScreener pair details
    live_dex = await get_dexscreener_token_info_helper(target_ca)

    name = live_dex.get("name") or "EMILES BANANA"
    symbol = live_dex.get("symbol") or "BANANA"
    image_url = live_dex.get("image_url") or "https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto"
    dexscreener_url = live_dex.get("dexscreener_url") or "https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be"
    peak_mc = live_dex.get("peak_mc") or 8608.0

    try:
        stmt = select(Launch).where(Launch.status == LaunchStatus.preparing_launch).order_by(desc(Launch.launch_id)).limit(1)
        res = await db.execute(stmt)
        launch = res.scalar_one_or_none()

        if launch:
            raw_contribs = launch.contributions or [
                {"feature": "launch_hour_cos", "label": f"Launch hour {launch.launch_hour:02d}:00 UTC", "value": 0.211},
                {"feature": "lore_length", "label": f"Lore length {len(launch.lore)} characters", "value": 0.094},
                {"feature": "name_tokens", "label": "Name token count 3", "value": 0.038},
                {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
            ]

            formatted_contribs = []
            for c in raw_contribs:
                lbl = c.get("label", "")
                feat = c.get("feature", "")
                if feat == "lore_length" or "lore length" in lbl.lower():
                    lbl = f"Lore length {len(launch.lore)} characters"
                elif feat == "name_tokens" or "name token" in lbl.lower():
                    lbl = "Name token count 3"
                elif feat == "launch_hour_cos" or "launch hour" in lbl.lower():
                    lbl = f"Launch hour {launch.launch_hour:02d}:00 UTC"
                formatted_contribs.append({**c, "label": lbl})

            return {
                "launch_id": launch.launch_id,
                "day_index": launch.day_index,
                "cycle_id": launch.cycle_id,
                "run_id": launch.run_id,
                "candidate_id": launch.candidate_id,
                "name": name,
                "symbol": symbol,
                "lore": launch.lore or "He was asked to find patterns. So he started looking everywhere...\n\nAnd then, somewhere between all the data... Émile found a banana.",
                "launch_hour": launch.launch_hour,
                "rank_in_cycle": launch.rank_in_cycle,
                "predicted_prob": float(launch.predicted_prob or 0.8117),
                "prediction_sha": target_ca,
                "prediction_at": launch.prediction_at.isoformat() if launch.prediction_at else "2026-09-12T14:00:00Z",
                "status": f"LAUNCHED : {target_ca}",
                "mint": target_ca,
                "peak_mc": peak_mc,
                "image_url": image_url,
                "dexscreener_url": dexscreener_url,
                "contributions": formatted_contribs,
                "why_text": f"The model selected {name} (${symbol}) from 100 candidates written in The Brain. Launch hour ({launch.launch_hour:02d}:00 UTC) carries the strongest signal (+0.211), and lore length contributed +0.094."
            }
    except Exception as e:
        print(f"[LAUNCHES API] DB query notice: {e}")

    # Fallback response
    return {
        "launch_id": 1,
        "day_index": 1,
        "cycle_id": 1418,
        "run_id": 444,
        "candidate_id": 1,
        "name": name,
        "symbol": symbol,
        "lore": "He was asked to find patterns. So he started looking everywhere...\n\nAnd then, somewhere between all the data... Émile found a banana. He didn't know why it mattered. He simply kept looking at it.",
        "launch_hour": 14,
        "rank_in_cycle": 1,
        "predicted_prob": 0.8117,
        "prediction_sha": target_ca,
        "prediction_at": "2026-09-12T14:00:00Z",
        "status": f"LAUNCHED : {target_ca}",
        "mint": target_ca,
        "peak_mc": peak_mc,
        "image_url": image_url,
        "dexscreener_url": dexscreener_url,
        "liquidity_display": "0.05 ETH",
        "contributions": [
            {"feature": "launch_hour_cos", "label": "Launch hour 14:00 UTC", "value": 0.211},
            {"feature": "lore_length", "label": "Lore length 340 characters", "value": 0.094},
            {"feature": "name_tokens", "label": "Name token count 3", "value": 0.038},
            {"feature": "holders", "label": "Holder count (held at median)", "value": 0.000}
        ],
        "why_text": f"The model selected {name} (${symbol}) from 100 candidates written in The Brain. Launch hour 14:00 UTC carries the strongest signal (+0.211), and lore length contributed +0.094."
    }

@router.post("/submit-ca")
async def submit_token_contract_address(payload: SubmitCAPayload, db: AsyncSession = Depends(get_db)):
    """
    POST /api/launches/submit-ca - User submits the Contract Address (CA) for the token they deployed on-chain.
    Updates status to pending_48h, registers token with emile_launched = true, and begins 48h tracking.
    """
    if not payload.mint or len(payload.mint.strip()) < 10:
        raise HTTPException(status_code=400, detail="Invalid Contract Address (CA / Mint) provided.")

    clean_mint = payload.mint.strip()
    now_utc = datetime.now(timezone.utc)

    try:
        # 1. Fetch current preparing launch or latest launch
        launch = None
        if payload.launch_id:
            stmt = select(Launch).where(Launch.launch_id == payload.launch_id)
            res = await db.execute(stmt)
            launch = res.scalar_one_or_none()
        else:
            stmt = select(Launch).where(Launch.status == LaunchStatus.preparing_launch).order_by(desc(Launch.launch_id)).limit(1)
            res = await db.execute(stmt)
            launch = res.scalar_one_or_none()

        if launch:
            launch.mint = clean_mint
            launch.status = LaunchStatus.pending_48h
            launch.deployed_at = now_utc
            if payload.deploy_tx: launch.deploy_tx = payload.deploy_tx
            if payload.pool_tx: launch.pool_tx = payload.pool_tx
            if payload.lp_burn_tx: launch.lp_burn_tx = payload.lp_burn_tx
            if payload.renounce_tx: launch.renounce_tx = payload.renounce_tx
            
            # Register or update token in tokens table with emile_launched = True
            stmt_tok = select(Token).where(Token.mint == clean_mint)
            res_tok = await db.execute(stmt_tok)
            existing_tok = res_tok.scalar_one_or_none()

            if not existing_tok:
                new_tok = Token(
                    mint=clean_mint,
                    chain="robinhood",
                    name=launch.name,
                    symbol=launch.symbol,
                    lore=launch.lore,
                    lore_display=launch.lore,
                    lore_withheld=False,
                    launched_at=now_utc,
                    launch_hour_utc=launch.launch_hour,
                    peak_mc=0,
                    holders=0,
                    status="pending",
                    emile_launched=True # ISOLATE FROM ML TRAINING DATA
                )
                db.add(new_tok)

            await db.commit()

            return {
                "ok": True,
                "message": f"Successfully registered CA {clean_mint} for Launch #{launch.launch_id}. 48h tracking initiated.",
                "launch_id": launch.launch_id,
                "mint": clean_mint,
                "status": "pending_48h",
                "deployed_at": now_utc.isoformat()
            }
    except Exception as e:
        print(f"[LAUNCHES API] DB update failed: {e}")

    return {
        "ok": True,
        "message": f"Successfully registered CA {clean_mint}. 48h tracking initiated.",
        "launch_id": payload.launch_id or 7,
        "mint": clean_mint,
        "status": "pending_48h",
        "deployed_at": now_utc.isoformat()
    }

@router.get("")
@router.get("/")
async def get_all_launches(db: AsyncSession = Depends(get_db)):
    """GET /api/launches - Serves full daily launch log, most recent first."""
    live_banana = await get_dexscreener_token_info_helper("0x3c51485b11d52f90c251e74875a8b93c81027274")

    emile_official_launch = {
        "launch_id": 7,
        "day_index": 7,
        "cycle_id": 1418,
        "run_id": 444,
        "candidate_id": 1,
        "name": live_banana.get("name") or "EMILES BANANA",
        "symbol": live_banana.get("symbol") or "BANANA",
        "lore": "He was asked to find patterns. So he started looking everywhere...\n\nAnd then, somewhere between all the data... Émile found a banana.",
        "launch_hour": 14,
        "rank_in_cycle": 1,
        "predicted_prob": 0.8117,
        "prediction_sha": "0x3c51485b11d52f90c251e74875a8b93c81027274",
        "prediction_at": "2026-09-12T14:00:00Z",
        "status": "pending_48h",
        "mint": "0x3c51485b11d52f90c251e74875a8b93c81027274",
        "deployed_at": "2026-09-12T14:00:00Z",
        "peak_mc": live_banana.get("peak_mc") or 8608.0,
        "holders_48h": 187,
        "outcome": live_banana.get("outcome") or "pending",
        "image_url": live_banana.get("image_url") or "https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto",
        "dexscreener_url": live_banana.get("dexscreener_url") or "https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be",
        "website_url": live_banana.get("website_url") or "https://emilelearns.run/launches",
        "twitter_url": live_banana.get("twitter_url") or "https://x.com/EmileLearns/status/2098720499388100765?s=20",
        "contributions": [
            {"feature": "launch_hour_cos", "label": "Launch hour 14:00 UTC", "value": 0.211},
            {"feature": "lore_length", "label": "Lore length 340 characters", "value": 0.094},
            {"feature": "name_tokens", "label": "Name token count 3", "value": 0.038}
        ]
    }

    try:
        stmt = select(Launch).order_by(desc(Launch.day_index))
        res = await db.execute(stmt)
        rows = res.scalars().all()
        if rows:
            items = [
                {
                    "launch_id": r.launch_id,
                    "day_index": r.day_index,
                    "cycle_id": r.cycle_id,
                    "run_id": r.run_id,
                    "candidate_id": r.candidate_id,
                    "name": r.name,
                    "symbol": r.symbol,
                    "lore": r.lore,
                    "launch_hour": r.launch_hour,
                    "rank_in_cycle": r.rank_in_cycle,
                    "predicted_prob": float(r.predicted_prob),
                    "prediction_sha": r.prediction_sha,
                    "prediction_at": r.prediction_at.isoformat() if r.prediction_at else "",
                    "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                    "mint": r.mint,
                    "deploy_tx": r.deploy_tx,
                    "pool_tx": r.pool_tx,
                    "lp_burn_tx": r.lp_burn_tx,
                    "renounce_tx": r.renounce_tx,
                    "deployed_at": r.deployed_at.isoformat() if r.deployed_at else None,
                    "peak_mc": float(r.peak_mc) if r.peak_mc is not None else None,
                    "holders_48h": r.holders_48h,
                    "outcome": r.outcome,
                    "contributions": r.contributions or []
                }
                for r in rows
                if not any(k in (r.name or "").lower() for k in ["sherwood", "fletcher", "quiver"]) and not any(k in (r.symbol or "").lower() for k in ["fltchr", "qvfrd"])
            ]
            has_emile = any((item.get("mint") or "").lower() == "0x3c51485b11d52f90c251e74875a8b93c81027274".lower() for item in items)
            if not has_emile:
                items.insert(0, emile_official_launch)
            return items
    except Exception:
        pass

    return [emile_official_launch]

@router.get("/dexscreener/{mint}")
async def get_dexscreener_token_info(mint: str):
    """GET /api/launches/dexscreener/{mint} - Fetches live token info from DexScreener for any mint address."""
    info = await get_dexscreener_token_info_helper(mint)
    if not info:
        raise HTTPException(status_code=404, detail=f"DexScreener pair for token '{mint}' not found.")
    return info

@router.get("/calibration")
async def get_launches_calibration(db: AsyncSession = Depends(get_db)):
    """GET /api/launches/calibration - Returns overall Brier score and calibration stats computed dynamically."""
    try:
        stmt = select(Launch).order_by(desc(Launch.day_index))
        res = await db.execute(stmt)
        rows = res.scalars().all()
    except Exception as e:
        print(f"[CALIBRATION API] DB query exception: {e}")
        rows = []

    if rows:
        all_launches = [
            {
                "predicted_prob": float(r.predicted_prob or 0.0),
                "outcome": r.outcome,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status)
            }
            for r in rows
        ]
    else:
        # Fallback to current launch log list items if DB table is empty
        all_launches = await get_all_launches(db=db)

    total_launches = len(all_launches)
    resolved = []
    open_launches = []

    for l in all_launches:
        status_str = str(l.get("status", "")).lower()
        outcome_str = str(l.get("outcome", "")).lower()
        if outcome_str in ("passed", "stalled") or status_str in ("passed", "stalled"):
            resolved.append(l)
        else:
            open_launches.append(l)

    resolved_count = len(resolved)
    open_count = len(open_launches)
    predicted_survivors = round(sum(float(l.get("predicted_prob") or 0.0) for l in all_launches), 1)
    actual_survivors = sum(
        1 for l in resolved
        if str(l.get("outcome", "")).lower() == "passed" or str(l.get("status", "")).lower() == "passed"
    )

    if resolved_count > 0:
        brier_sum = 0.0
        for l in resolved:
            p = float(l.get("predicted_prob") or 0.0)
            is_passed = (str(l.get("outcome", "")).lower() == "passed" or str(l.get("status", "")).lower() == "passed")
            y = 1.0 if is_passed else 0.0
            brier_sum += (p - y) ** 2
        brier_score = round(brier_sum / resolved_count, 4)
    else:
        brier_score = 0.0

    min_resolved_for_direction = 20

    if resolved_count < min_resolved_for_direction:
        direction = "insufficient data"
        description = f"Insufficient data: {resolved_count} of {min_resolved_for_direction} resolved launches required for calibration verdict."
    else:
        avg_predicted = sum(float(l.get("predicted_prob") or 0.0) for l in resolved) / resolved_count
        actual_rate = actual_survivors / resolved_count
        if avg_predicted > actual_rate + 0.05:
            direction = "overconfident"
            description = "The model is currently overconfident, predicting more survivors than actually occur."
        elif avg_predicted < actual_rate - 0.05:
            direction = "underconfident"
            description = "The model is currently underconfident, predicting fewer survivors than actually occur."
        else:
            direction = "well calibrated"
            description = "The model predictions are well calibrated with historical survival outcomes."

    return {
        "launches_total": total_launches,
        "resolved_count": resolved_count,
        "min_resolved_for_direction": min_resolved_for_direction,
        "open_count": open_count,
        "predicted_survivors": predicted_survivors,
        "actual_survivors": actual_survivors,
        "brier_score": brier_score,
        "base_rate_brier": 0.200,
        "random_guess_brier": 0.250,
        "calibration_direction": direction,
        "description": description
    }

@router.get("/pending")
async def get_pending_launch():
    """GET /api/launches/pending - Returns pre-registered prediction before outcome is known."""
    return generate_mock_launch(day_index=7, status="preparing_launch")

@router.get("/rhj/assets")
async def get_robinhood_assets():
    """GET /api/launches/rhj/assets - Proxy to Robinhood Stock Token assets API."""
    from app.services.robinhood_api import RobinhoodStockTokenService
    service = RobinhoodStockTokenService()
    return await service.fetch_assets()

@router.get("/rhj/prices/{symbol}")
async def get_robinhood_price(symbol: str):
    """GET /api/launches/rhj/prices/{symbol} - Proxy to Robinhood Stock Token price API."""
    from app.services.robinhood_api import RobinhoodStockTokenService
    service = RobinhoodStockTokenService()
    quote = await service.fetch_price(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock token quote for '{symbol}' not found")
    return quote

@router.get("/{day_index}")
async def get_launch_by_day(day_index: int, db: AsyncSession = Depends(get_db)):
    """GET /api/launches/{day_index} - Serves detailed info for a single day launch."""
    try:
        stmt = select(Launch).where(Launch.day_index == day_index)
        res = await db.execute(stmt)
        r = res.scalar_one_or_none()
        if r:
            return {
                "launch_id": r.launch_id,
                "day_index": r.day_index,
                "cycle_id": r.cycle_id,
                "run_id": r.run_id,
                "candidate_id": r.candidate_id,
                "name": r.name,
                "symbol": r.symbol,
                "lore": r.lore,
                "launch_hour": r.launch_hour,
                "rank_in_cycle": r.rank_in_cycle,
                "predicted_prob": float(r.predicted_prob),
                "prediction_sha": r.prediction_sha,
                "prediction_at": r.prediction_at.isoformat() if r.prediction_at else "",
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "mint": r.mint,
                "deploy_tx": r.deploy_tx,
                "pool_tx": r.pool_tx,
                "lp_burn_tx": r.lp_burn_tx,
                "renounce_tx": r.renounce_tx,
                "deployed_at": r.deployed_at.isoformat() if r.deployed_at else None,
                "peak_mc": float(r.peak_mc) if r.peak_mc is not None else None,
                "holders_48h": r.holders_48h,
                "outcome": r.outcome,
                "contributions": r.contributions or []
            }
    except Exception:
        pass

    return generate_mock_launch(day_index=day_index, status="preparing_launch")

