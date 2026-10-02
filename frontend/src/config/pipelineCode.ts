// Excerpts of the code the backend actually runs (backend/app/...).
// Lines are copied verbatim; "..." marks lines left out for length.
// Keep these in sync when the backend files change.

export interface CodeBlock {
  stage: string;
  file: string;
  src: string;
}

/** "epoch labs : live": the ingestion loop that feeds the token table. */
export const LIVE_BLOCKS: CodeBlock[] = [
  {
    stage: 'scan · dexscreener',
    file: 'services/mint_source.py',
    src: `async def fetch_since(self, cursor: datetime) -> list[RawMint]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        res_dex = await client.get(self.dexscreener_profiles)
        if res_dex.status_code == 200:
            for item in res_dex.json():
                chain_id = (item.get("chainId") or "").lower()
                token_addr = item.get("tokenAddress") or ""

                # EXPLICIT STRICT REJECTION of Solana / pump.fun tokens
                if chain_id == "solana" or token_addr.endswith("pump"):
                    continue
                if token_addr in seen_mints or token_addr in self.scanned_history:
                    continue
                ...
                mints.append(RawMint(mint=token_addr, name=clean_name,
                                     symbol=clean_sym, lore=lore_clean,
                                     launched_at=datetime.now(timezone.utc),
                                     chain="robinhood"))`,
  },
  {
    stage: 'pricing · dexscreener',
    file: 'services/dexscreener.py',
    src: `chunks = [mint_addresses[i:i + 30] for i in range(0, len(mint_addresses), 30)]

for chunk in chunks:
    url = f"{self.base_url}/tokens/{','.join(chunk)}"
    while retries <= max_retries and not success:
        res = await client.get(url)
        if res.status_code == 200:
            for pair in res.json().get("pairs") or []:
                mint = pair["baseToken"].get("address")
                fdv = float(pair.get("fdv") or pair.get("marketCap") or 0.0)
                if mint and fdv > 0:
                    prev_mc = results.get(mint, {}).get("mc", 0.0)
                    results[mint] = {"mc": max(prev_mc, fdv), ...}
            success = True
        elif res.status_code in [429, 500, 502, 503, 504]:
            retries += 1
            await asyncio.sleep((2 ** retries) + random.random() * 0.5)

if self.consecutive_errors >= 10:
    self.circuit_open_until = asyncio.get_event_loop().time() + 60.0`,
  },
  {
    stage: 'upsert · peak cap',
    file: 'services/ingest_worker.py',
    src: `# peak only ever goes up: a token that touched 30K stays passed
INSERT INTO tokens (mint, chain, name, symbol, lore, peak_mc, status, ...)
VALUES (:mint, :chain, :name, :symbol, :lore, :peak_mc,
        CASE WHEN :peak_mc >= 30000.0 THEN 'passed' ELSE 'pending' END, ...)
ON CONFLICT (mint) DO UPDATE SET
    peak_mc      = GREATEST(tokens.peak_mc, EXCLUDED.peak_mc),
    last_seen_mc = EXCLUDED.last_seen_mc,
    poll_count   = tokens.poll_count + 1,
    status = CASE
        WHEN GREATEST(tokens.peak_mc, EXCLUDED.peak_mc) >= 30000.0 THEN 'passed'
        ELSE tokens.status
    END,
    crossed_10k_at = CASE
        WHEN tokens.crossed_10k_at IS NULL AND EXCLUDED.peak_mc >= 10000.0 THEN :now
        ELSE tokens.crossed_10k_at
    END
RETURNING (xmax = 0) AS is_new;`,
  },
  {
    stage: 'labeling · 48h',
    file: 'services/holder_sampler.py',
    src: `async def run_label_worker_cycle(db: AsyncSession) -> dict:
    cutoff = text("NOW() - INTERVAL '48 hours'")
    query = select(Token).where(
        Token.status == TokenStatus.pending,
        Token.launched_at <= cutoff
    ).limit(100)

    for token in (await db.execute(query)).scalars().all():
        # 1. Sample holders ONCE at 48h mark
        token.holders = await sample_token_holders_rpc(token.mint)
        token.holders_sampled_at = now
        token.labeled_at = now

        # 2. Assign label based on $30K peak market cap rule
        if float(token.peak_mc) >= 30000.0:
            token.status = TokenStatus.passed
        else:
            token.status = TokenStatus.stalled

    await db.commit()`,
  },
];

/** "Learning Pipeline": features → training → proof → gates. */
export const LEARNING_BLOCKS: CodeBlock[] = [
  {
    stage: 'features',
    file: 'ml/features.py',
    src: `X_num = pd.DataFrame(index=df.index)

hours = df["launch_hour_utc"].astype(float)
X_num["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
X_num["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)

dows = pd.to_datetime(df["launched_at"]).dt.dayofweek
X_num = pd.concat([X_num, pd.get_dummies(dows, prefix="dow")], axis=1)

X_num["holders_log"]  = np.log1p(df["holders"].fillna(0).astype(float))
X_num["lore_len"]     = lore_text.str.split().str.len().astype(float)
X_num["lore_missing"] = df["lore"].isna().astype(float)
X_num["name_tokens"]  = df["name"].fillna("").astype(str).str.split().str.len()

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(lore_text.tolist(), batch_size=64)
pca_model = PCA(n_components=24, random_state=42)
X_mat = np.hstack([X_num.values, pca_model.fit_transform(embeddings)])`,
  },
  {
    stage: 'training',
    file: 'ml/trainer.py',
    src: `assert_no_leakage(df)              # no price, volume or liquidity features
X, pca_model = extract_features(df)
y = (df["status"] == "passed").astype(int).values

cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
clf = LGBMClassifier(
    n_estimators=400,
    learning_rate=0.03,
    class_weight="balanced",
    min_child_samples=min_child,
    random_state=42,
)

cv_scores = cross_val_score(clf, X, y, cv=cv, scoring="roc_auc")
auc_mean = float(cv_scores.mean())
auc_std  = float(cv_scores.std())

clf.fit(X, y)
y_pred_proba = clf.predict_proba(X)[:, 1]
time_gap = evaluate_time_split_gap(X, y, df)`,
  },
  {
    stage: 'proof · vc + bootstrap',
    file: 'ml/jar_math.py',
    src: `def calculate_epsilon_vc(n: int, d: int = 28, delta: float = 0.05) -> float:
    if n <= d or n <= 0:
        return 1.0
    term1 = d * (math.log(2.0 * n / d) + 1.0)
    term2 = math.log(4.0 / delta)
    return math.sqrt((term1 + term2) / n)

def compute_bootstrap_auc_lower(y_true, y_pred_proba, n_bootstraps=2000,
                                alpha_percentile=2.5) -> float:
    rng = np.random.RandomState(42)
    for _ in range(n_bootstraps):
        indices = rng.randint(0, n_samples, n_samples)
        if len(np.unique(y_true[indices])) < 2:
            continue
        bootstrapped_scores.append(
            roc_auc_score(y_true[indices], y_pred_proba[indices]))
    return float(np.percentile(bootstrapped_scores, alpha_percentile))`,
  },
  {
    stage: 'gates · hourglass',
    file: 'ml/jar_math.py',
    src: `eps_vc      = calculate_epsilon_vc(n_samples, d)
floor_vc    = auc_mean - eps_vc
floor_boot  = compute_bootstrap_auc_lower(y_true, y_pred_proba, n_bootstraps=2000)
proven_floor = min(floor_vc, floor_boot)

raw_jar_level = float(np.clip((auc_mean - floor_auc) / (target_auc - floor_auc), 0.0, 1.0))

gates = {
    "n_samples":  n_samples >= 2000,
    "n_positive": n_positive >= 200,
    "auc_std":    auc_std < 0.05,
    "time_split": time_split_gap <= 0.04,
}
all_passed = all(gates.values())
blocked_by = None if all_passed else next(k for k, v in gates.items() if not v)

# Cap jar level at 0.95 if any gate fails
jar_level = raw_jar_level if all_passed else min(raw_jar_level, 0.95)`,
  },
];
