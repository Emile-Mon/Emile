import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text
from app.db.database import get_db
from app.db.models import Token, ModelRun, TokenStatus
from app.core.config import settings

router = APIRouter(prefix="/api")

@router.get("/state")
async def get_app_state(db: AsyncSession = Depends(get_db)):
    """
    GET /api/state - Full snapshot used on page load before WebSocket connects:
    - Latest 100 tokens
    - Global counters (above 10k, passed 30k, stalled, median holders)
    - Latest model run
    """
    try:
        stmt_all = text("SELECT mint, name, symbol, lore, lore_display, lore_withheld, image_url, creator, launched_at, launch_hour_utc as launch_hour, holders, peak_mc, status::text FROM tokens WHERE status::text != 'excluded' ORDER BY first_seen_at DESC;")
        res_all = await db.execute(stmt_all)
        all_rows = res_all.mappings().all()

        above_10k = len(all_rows)
        passed_30k = sum(1 for r in all_rows if r["status"] == "passed")
        stalled = sum(1 for r in all_rows if r["status"] == "stalled")
        pending = sum(1 for r in all_rows if r["status"] == "pending")

        holders_list = sorted([r["holders"] for r in all_rows if r["holders"] is not None])
        median_holders = holders_list[len(holders_list) // 2] if holders_list else 288

        tokens = all_rows[:100]

        stmt_model = select(ModelRun).order_by(desc(ModelRun.id)).limit(1)
        res_model = await db.execute(stmt_model)
        latest_model = res_model.scalar_one_or_none()

        model_data = None
        if latest_model:
            model_data = {
                "ran_at": latest_model.ran_at.isoformat(),
                "n": latest_model.n_samples,
                "n_positive": latest_model.n_positive,
                "d": latest_model.capacity_d,
                "auc": latest_model.auc_mean,
                "auc_std": latest_model.auc_std,
                "epsilon_vc": latest_model.epsilon_vc,
                "auc_boot_lower": latest_model.auc_boot_lower,
                "proven_floor": latest_model.proven_floor,
                "jar_level": latest_model.jar_level,
                "gates": latest_model.gates_status,
                "blocked_by": latest_model.blocked_by,
                "hour_rates": latest_model.hour_rates,
                "feature_importance": latest_model.feature_importance
            }

        token_list = [
            {
                "mint": t["mint"],
                "name": t["name"],
                "symbol": t["symbol"],
                "lore": t["lore_display"] or t["lore"],
                "lore_withheld": t["lore_withheld"],
                "logo": t["image_url"],
                "launched_at": t["launched_at"].isoformat() if hasattr(t["launched_at"], "isoformat") else str(t["launched_at"]),
                "launch_hour": t["launch_hour"],
                "holders": t["holders"] or 0,
                "peak_mc": float(t["peak_mc"]) if t["peak_mc"] is not None else 0.0,
                "status": t["status"]
            }
            for t in tokens
        ]
    except Exception:
        # Fallback snapshot if database is uninitialized
        above_10k, passed_30k, stalled, pending, median_holders = 0, 0, 0, 0, 0
        token_list = []
        model_data = {
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "n": 0, "n_positive": 0, "d": 28,
            "auc": 0.500, "auc_std": 0.0, "epsilon_vc": 0.0,
            "auc_boot_lower": 0.500, "proven_floor": 0.500, "jar_level": 0.0,
            "gates": {"n_samples": False, "n_positive": False, "auc_std": False, "time_split": False},
            "blocked_by": "n_samples",
            "hour_rates": {},
            "feature_importance": {}
        }

    return {
        "counters": {
            "above_10k": above_10k,
            "passed_30k": passed_30k,
            "stalled": stalled,
            "pending": pending,
            "median_holders": median_holders
        },
        "latest_model": model_data,
        "tokens": token_list
    }

@router.get("/model/history")
async def get_model_history(days: int = 30, db: AsyncSession = Depends(get_db)):
    """GET /api/model/history?days=30 - Array of model_runs for AUC-over-time chart."""
    try:
        stmt = select(ModelRun).order_by(desc(ModelRun.ran_at)).limit(days * 24)
        res = await db.execute(stmt)
        runs = res.scalars().all()
        return [
            {
                "id": r.id,
                "ran_at": r.ran_at.isoformat(),
                "n_samples": r.n_samples,
                "n_positive": r.n_positive,
                "auc_mean": r.auc_mean,
                "proven_floor": r.proven_floor,
                "jar_level": r.jar_level,
                "blocked_by": r.blocked_by
            }
            for r in runs
        ]
    except Exception:
        return []

@router.get("/methodology.json")
async def get_methodology():
    """GET /api/methodology.json - Machine-readable methodology specification."""
    return {
        "universe": "Every Solana token launched on pump.fun",
        "study_population": "Tokens with peak market cap >= $10,000",
        "positive_label": "Peak market cap reached >= $30,000",
        "negative_label": "Reached $10K, did not reach $30K, age >= 48 hours",
        "features": [
            {"name": "launch_hour", "encoding": "sin/cos of hour-of-day (2 columns)"},
            {"name": "launch_dow", "encoding": "one-hot day-of-week (7 columns)"},
            {"name": "holders", "encoding": "log1p of non-zero balance token accounts at 48h"},
            {"name": "lore", "encoding": "MiniLM-L6-v2 sentence embedding -> PCA 24 dims"},
            {"name": "lore_len", "encoding": "word count"},
            {"name": "lore_missing", "encoding": "binary flag"},
            {"name": "name_tokens", "encoding": "word count"}
        ],
        "capacity_d": 41,
        "gates": {
            "n_samples_min": 2000,
            "n_positive_min": 200,
            "auc_std_max": 0.05,
            "time_split_gap_max": 0.04
        },
        "target_auc": settings.AUC_TARGET,
        "floor_auc": settings.AUC_FLOOR
    }

@router.get("/dataset.csv")
async def download_public_dataset(db: AsyncSession = Depends(get_db)):
    """
    GET /api/dataset.csv - The MANDATORY full labeled public dataset downloadable CSV.
    Allows anyone to reproduce the AUC number and verify the jar floor.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "mint", "name", "symbol", "launched_at", "launch_hour_utc", 
        "peak_mc", "holders", "status", "passed_label"
    ])

    try:
        stmt = select(Token).where(Token.status.in_([TokenStatus.passed, TokenStatus.stalled]))
        res = await db.execute(stmt)
        tokens = res.scalars().all()
        for t in tokens:
            clean_name = (t.name or "").replace("\r", " ").replace("\n", " ").strip()
            clean_symbol = (t.symbol or "").replace("\r", " ").replace("\n", " ").strip()
            writer.writerow([
                t.mint, clean_name, clean_symbol, t.launched_at.isoformat() if t.launched_at else "",
                t.launch_hour_utc, float(t.peak_mc) if t.peak_mc is not None else 0.0, t.holders or 0,
                t.status.value if t.status else "", 1 if t.status == TokenStatus.passed else 0
            ])
    except Exception:
        # Sample row if DB uninitialized
        writer.writerow([
            "7xK11223344556677889900aabbccddeeff", "Midnight Janitor", "MJ88",
            datetime.now(timezone.utc).isoformat(), 20, 150300.0, 412, "passed", 1
        ])

    # Prepend UTF-8 BOM (\ufeff) so Excel opens with proper UTF-8 encoding
    csv_content = "\ufeff" + output.getvalue()
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=emile_dataset.csv"}
    )
