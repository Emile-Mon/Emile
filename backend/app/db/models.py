import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Numeric, Integer, SmallInteger, 
    Boolean, DateTime, Date, BigInteger, Enum, ForeignKey, Text, Float
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.database import Base

class TokenStatus(str, enum.Enum):
    pending = "pending"
    passed = "passed"
    stalled = "stalled"
    excluded = "excluded"

class Token(Base):
    __tablename__ = "tokens"

    mint = Column(String, primary_key=True, index=True)
    chain = Column(String, nullable=False, default="robinhood")
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    lore = Column(Text, nullable=True)
    lore_display = Column(Text, nullable=True)
    lore_withheld = Column(Boolean, nullable=False, default=False)
    image_url = Column(String, nullable=True)
    image_cached_path = Column(String, nullable=True)
    creator = Column(String, nullable=True)
    launched_at = Column(DateTime(timezone=True), nullable=False)
    launch_hour_utc = Column(SmallInteger, nullable=True)

    peak_mc = Column(Numeric(20, 2), nullable=False, default=0)
    last_seen_mc = Column(Numeric(20, 2), nullable=True)
    crossed_10k_at = Column(DateTime(timezone=True), nullable=True)
    holders = Column(Integer, nullable=True)
    holders_sampled_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(Enum(TokenStatus, name="token_status"), nullable=False, default=TokenStatus.pending)
    labeled_at = Column(DateTime(timezone=True), nullable=True)

    first_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_polled_at = Column(DateTime(timezone=True), nullable=True)
    poll_count = Column(Integer, nullable=False, default=0)
    emile_launched = Column(Boolean, nullable=False, default=False, index=True)

class DailyUniverse(Base):
    __tablename__ = "daily_universe"

    day = Column(Date, primary_key=True)
    minted_total = Column(Integer, nullable=False, default=0)
    crossed_10k = Column(Integer, nullable=False, default=0)
    crossed_30k = Column(Integer, nullable=False, default=0)

class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ran_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    n_samples = Column(Integer, nullable=False)
    n_positive = Column(Integer, nullable=False)
    capacity_d = Column(Integer, nullable=False)
    auc_mean = Column(Float, nullable=False)
    auc_std = Column(Float, nullable=False)
    epsilon_vc = Column(Float, nullable=False)
    auc_boot_lower = Column(Float, nullable=False)
    proven_floor = Column(Float, nullable=False)
    jar_level = Column(Float, nullable=False)
    gates_status = Column(JSONB, nullable=False)
    blocked_by = Column(String, nullable=True)
    feature_importance = Column(JSONB, nullable=False)
    hour_rates = Column(JSONB, nullable=False)
    notes = Column(Text, nullable=True)

class IngestLog(Base):
    __tablename__ = "ingest_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    source = Column(String, nullable=False)
    ok = Column(Integer, nullable=False, default=0)
    failed = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=True)

class LoreModerationLog(Base):
    __tablename__ = "lore_moderation_log"

    mint = Column(String, ForeignKey("tokens.mint"), primary_key=True)
    raw_lore = Column(Text, nullable=True)
    filtered_reason = Column(String, nullable=True)
    filtered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

# Émile 1.5 — Autonomous Idea Generation Models
class IdeaCycle(Base):
    __tablename__ = "idea_cycles"

    cycle_id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(BigInteger, ForeignKey("model_runs.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    generator_sha = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    seed = Column(String, nullable=False)
    median_holders = Column(Integer, nullable=False)
    n_generated = Column(Integer, nullable=False)
    n_rejected = Column(Integer, nullable=False)
    n_excluded = Column(Integer, nullable=False)

class IdeaCandidate(Base):
    __tablename__ = "idea_candidates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    cycle_id = Column(BigInteger, ForeignKey("idea_cycles.cycle_id"), nullable=False)
    rank = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    lore = Column(Text, nullable=False)
    hour = Column(SmallInteger, nullable=False)
    score = Column(Numeric(8, 6), nullable=False)
    commitment = Column(String, nullable=False)
    committed_at = Column(DateTime(timezone=True), nullable=False)
    image_sha = Column(String, nullable=True)

class IdeaExclusion(Base):
    __tablename__ = "idea_exclusions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    first_cycle = Column(BigInteger, nullable=False)
    first_seen_at = Column(DateTime(timezone=True), nullable=False)
    deployed_mint = Column(String, nullable=False)
    deployer = Column(String, nullable=False)
    deployed_at = Column(DateTime(timezone=True), nullable=False)
    block_number = Column(BigInteger, nullable=False)

class LaunchStatus(str, enum.Enum):
    preparing_launch = "preparing_launch"
    pending_48h = "pending_48h"
    passed = "passed"
    stalled = "stalled"
    skipped = "skipped"

class Launch(Base):
    __tablename__ = "launches"

    launch_id = Column(BigInteger, primary_key=True, autoincrement=True)
    day_index = Column(Integer, nullable=False, unique=True)
    cycle_id = Column(BigInteger, ForeignKey("idea_cycles.cycle_id"), nullable=False)
    run_id = Column(BigInteger, ForeignKey("model_runs.id"), nullable=False)
    candidate_id = Column(BigInteger, ForeignKey("idea_candidates.id"), nullable=False)

    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    lore = Column(Text, nullable=False)
    launch_hour = Column(SmallInteger, nullable=False)
    rank_in_cycle = Column(Integer, nullable=False)

    predicted_prob = Column(Numeric(8, 6), nullable=False)
    prediction_sha = Column(String, nullable=False)
    prediction_at = Column(DateTime(timezone=True), nullable=False)

    status = Column(Enum(LaunchStatus, name="launch_status"), nullable=False, default=LaunchStatus.preparing_launch)
    mint = Column(String, nullable=True, unique=True)
    deploy_tx = Column(String, nullable=True)
    pool_tx = Column(String, nullable=True)
    lp_burn_tx = Column(String, nullable=True)
    renounce_tx = Column(String, nullable=True)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    liquidity_wei = Column(Numeric(40, 0), nullable=True)

    peak_mc = Column(Numeric(18, 2), nullable=True)
    holders_48h = Column(Integer, nullable=True)
    outcome = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    contributions = Column(JSONB, nullable=True)
    skipped_reason = Column(Text, nullable=True)


