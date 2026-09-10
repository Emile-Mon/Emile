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
