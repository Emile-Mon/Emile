-- Émile Platform — Database DDL Schema (PostgreSQL 15+)

-- Drop existing tables/types if needed
DROP TABLE IF EXISTS lore_moderation_log CASCADE;
DROP TABLE IF EXISTS ingest_log CASCADE;
DROP TABLE IF EXISTS model_runs CASCADE;
DROP TABLE IF EXISTS daily_universe CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TYPE IF EXISTS token_status CASCADE;

-- Token status enum
CREATE TYPE token_status AS ENUM ('pending', 'passed', 'stalled', 'excluded');

-- Tokens table: All pump.fun tokens clearing peak market cap $10,000
CREATE TABLE tokens (
    mint                TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    symbol              TEXT NOT NULL,
    lore                TEXT,                             -- Raw metadata description
    lore_display        TEXT,                             -- Sanitized display lore (max 280 chars, URLs & control chars removed)
    lore_withheld       BOOLEAN NOT NULL DEFAULT FALSE,   -- True if profanity/slur filter triggered
    image_url           TEXT,                             -- Original Metaplex/IPFS image URI
    image_cached_path   TEXT,                             -- Local 64x64 WebP thumbnail path
    creator             TEXT,
    launched_at         TIMESTAMPTZ NOT NULL,
    launch_hour_utc     SMALLINT GENERATED ALWAYS AS 
                        (EXTRACT(HOUR FROM launched_at AT TIME ZONE 'UTC')::SMALLINT) STORED,

    peak_mc             NUMERIC(20,2) NOT NULL DEFAULT 0,
    last_seen_mc        NUMERIC(20,2),
    crossed_10k_at      TIMESTAMPTZ,                      -- Timestamp when token entered study
    holders             INTEGER,                          -- Holder count sampled at 48h mark
    holders_sampled_at  TIMESTAMPTZ,

    status              token_status NOT NULL DEFAULT 'pending',
    labeled_at          TIMESTAMPTZ,

    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_polled_at      TIMESTAMPTZ,
    poll_count          INTEGER NOT NULL DEFAULT 0
);

-- Indexes for performance optimization
CREATE INDEX idx_tokens_status_launch ON tokens (status, launched_at DESC);
CREATE INDEX idx_tokens_pending_poll  ON tokens (last_polled_at) WHERE status = 'pending';
CREATE INDEX idx_tokens_crossed       ON tokens (crossed_10k_at DESC) WHERE crossed_10k_at IS NOT NULL;

-- Daily Universe table: Aggregate daily counters for true base rate calculation
CREATE TABLE daily_universe (
    day                DATE PRIMARY KEY,
    minted_total       INTEGER NOT NULL DEFAULT 0,
    crossed_10k        INTEGER NOT NULL DEFAULT 0,
    crossed_30k        INTEGER NOT NULL DEFAULT 0
);

-- Model Runs table: Hourly training run history & Jar level calculation
CREATE TABLE model_runs (
    id              BIGSERIAL PRIMARY KEY,
    ran_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    n_samples       INTEGER NOT NULL,
    n_positive      INTEGER NOT NULL,
    capacity_d      INTEGER NOT NULL,
    auc_mean        DOUBLE PRECISION NOT NULL,
    auc_std         DOUBLE PRECISION NOT NULL,
    epsilon_vc      DOUBLE PRECISION NOT NULL,
    auc_boot_lower  DOUBLE PRECISION NOT NULL,
    proven_floor    DOUBLE PRECISION NOT NULL,
    jar_level       DOUBLE PRECISION NOT NULL,            -- Clamped 0.0 .. 1.0
    gates_status    JSONB NOT NULL,                       -- {n_samples, n_positive, auc_std, time_split}
    blocked_by      TEXT,                                 -- First failing gate name, NULL if all passed
    feature_importance JSONB NOT NULL,
    hour_rates      JSONB NOT NULL,
    notes           TEXT                                  -- Includes failed training attempts
);

-- Ingest Log table: Worker performance and latency tracking
CREATE TABLE ingest_log (
    id          BIGSERIAL PRIMARY KEY,
    at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    source      TEXT NOT NULL,                            -- 'pumpfun' | 'dexscreener' | 'rpc'
    ok          INTEGER NOT NULL DEFAULT 0,
    failed      INTEGER NOT NULL DEFAULT 0,
    latency_ms  INTEGER
);

-- Lore Moderation Log table: Audit trail for lore sanitization
CREATE TABLE lore_moderation_log (
    mint            TEXT PRIMARY KEY REFERENCES tokens(mint),
    raw_lore        TEXT,
    filtered_reason TEXT,                                 -- 'profanity' | 'slur' | 'url_stripped' | 'control_chars' | NULL
    filtered_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Twitter Posts table: Audit trail for auto-tweet publications
CREATE TABLE IF NOT EXISTS twitter_posts (
    id              BIGSERIAL PRIMARY KEY,
    tweet_id        TEXT,
    text            TEXT NOT NULL,
    target_token    TEXT NOT NULL DEFAULT 'emile',
    market_cap_usd  NUMERIC(20, 2),
    volume_24h_usd  NUMERIC(20, 2),
    holders_count   INTEGER,
    trigger_type    TEXT NOT NULL DEFAULT 'recurring_2h_news',
    status          TEXT NOT NULL DEFAULT 'dry_run',
    posted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_message   TEXT
);
