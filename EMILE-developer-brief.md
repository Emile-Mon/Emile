# Émile — Developer Brief

**Version** 1.0
**Status** Build spec, phase 1
**Prototypes** `almost-surely-home.html` (landing page), `survival-console.html` (research console)

---

## 1. What Émile is

Émile is an autonomous agent that reads every Solana token launched on pump.fun that crosses **$10,000 peak market cap**, and learns which of them go on to reach **$30,000 peak market cap**. He publishes everything he learns, live, on a public web page.

He does not launch a token of his own until his model's **proven** performance floor clears **AUC 0.60**. That threshold is enforced in code, not by a calendar. The jar on the landing page is the visual representation of that gate.

### What Émile is not

Read this section before writing any copy or UI text.

- Émile **does not predict price**. He estimates the probability that a token which already reached $10K will reach $30K.
- Émile **does not have an edge that guarantees returns**. Four features cannot forecast a market.
- The jar **is not decorative**. If the model is bad, the jar stays empty and the site says so.

Any UI element, tweet, or piece of copy implying prediction of price, guaranteed returns, or "alpha" is out of scope and must be rejected in review.

---

## 2. Architecture

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  pump.fun   │   │ DexScreener  │   │  Solana RPC  │
│  new mints  │   │  peak cap    │   │  holders     │
└──────┬──────┘   └──────┬───────┘   └──────┬───────┘
       │                 │                  │
       └────────┬────────┴──────────────────┘
                ▼
        ┌───────────────┐
        │  ingest       │  worker, every 60s
        │  worker       │
        └───────┬───────┘
                ▼
        ┌───────────────┐        ┌──────────────┐
        │  PostgreSQL   │◄───────│ label worker │ every 15 min
        └───────┬───────┘        └──────────────┘
                │
         ┌──────┴──────┐
         ▼             ▼
  ┌────────────┐  ┌──────────────┐
  │ train job  │  │  API server  │
  │ hourly     │  │  REST + WS   │
  └─────┬──────┘  └──────┬───────┘
        │                │
        └────────┬───────┘
                 ▼
          ┌─────────────┐
          │  frontend   │
          └─────────────┘
```

**Stack recommendation.** Python 3.11 for workers and training (pandas, LightGBM, scikit-learn, APScheduler). FastAPI for the API server including the WebSocket. PostgreSQL 15+. Redis for the live event bus between workers and API server. Frontend as-is from the prototypes, or ported to React/Next.js — the prototypes are framework-free on purpose so either path works.

Do not use SQLite. The label worker and ingest worker write concurrently.

---

## 3. Data sources

### 3.1 pump.fun — new mints, name, symbol, lore, launch time

**Important:** pump.fun does not publish a stable, officially supported public API. Community endpoints exist but change without notice. Do not build on a single source.

Evaluate and pick in this order:
1. **A commercial indexer** — Bitquery, Moralis Solana API, or Helius webhooks filtered on the pump.fun program ID. Costs money, but stable and supported. Recommended for production.
2. **Direct program log subscription** — subscribe to the pump.fun program via `logsSubscribe` on a paid RPC, decode the create instruction. Most robust, most work.
3. **Community REST endpoints** — fastest to prototype, will break. Acceptable for the first two weeks only.

Whatever is chosen, wrap it behind a single interface so it can be swapped:

```python
class MintSource(Protocol):
    def fetch_since(self, cursor: datetime) -> list[RawMint]: ...
```

Token metadata (name, symbol, description/lore, image URI) comes from the Metaplex metadata account. The on-chain `uri` field points to a JSON document, usually on IPFS, containing `name`, `symbol`, `description`, `image`. **The `description` field is the lore.**

### 3.2 DexScreener — market cap

Public API at `https://api.dexscreener.com`. Confirm current rate limits in their docs before sizing the worker; they have changed before. Assume roughly 300 requests/minute for the pairs endpoint and design for backoff regardless.

Batch endpoint accepts multiple token addresses per call. Use it. One call per token will exhaust the limit within minutes.

**Critical:** the gate and the label both use **peak market cap**, never current market cap. A token that touched $25K and fell back to $8K has crossed the $10K gate. Since DexScreener returns a point-in-time value, peak must be accumulated by us:

```sql
UPDATE tokens SET peak_mc = GREATEST(peak_mc, $1), last_seen_mc = $1 WHERE mint = $2;
```

Poll each unresolved token at least every 10 minutes for its first 48 hours. Peak resolution is only as good as polling frequency; document the sampling interval on the site because it is a known source of measurement error.

### 3.3 Solana RPC — holder count

This is the only feature requiring a chain call and it is the expensive one.

The textbook approach is `getProgramAccounts` on the SPL Token program with `dataSize: 165` and a `memcmp` filter at offset 0 for the mint. **Most public RPC providers disable or heavily throttle this call.** Do not build on a free public endpoint.

Preferred: a provider with a dedicated token-accounts endpoint — Helius `getTokenAccounts` (DAS API) with pagination is the usual choice. Budget for a paid plan.

Definition to use, and to state publicly on the site:

> Holder count = number of token accounts with a non-zero balance, sampled once at labeling time (48 hours after launch).

Sample **once**, at label time, not continuously. This keeps RPC cost bounded and keeps the feature well-defined. Store `holders_sampled_at` alongside it so the definition is auditable.

---

## 4. Database schema

```sql
CREATE TYPE token_status AS ENUM ('pending', 'passed', 'stalled', 'excluded');

CREATE TABLE tokens (
    mint                TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    symbol              TEXT NOT NULL,
    lore                TEXT,                    -- metadata.description, may be null
    image_url           TEXT,                    -- original URI, may be IPFS
    image_cached_path   TEXT,                    -- our 64x64 thumbnail, see §5
    creator             TEXT,
    launched_at         TIMESTAMPTZ NOT NULL,
    launch_hour_utc     SMALLINT GENERATED ALWAYS AS
                        (EXTRACT(HOUR FROM launched_at AT TIME ZONE 'UTC')::SMALLINT) STORED,

    peak_mc             NUMERIC(20,2) NOT NULL DEFAULT 0,
    last_seen_mc        NUMERIC(20,2),
    crossed_10k_at      TIMESTAMPTZ,             -- when it entered the study
    holders             INTEGER,
    holders_sampled_at  TIMESTAMPTZ,

    status              token_status NOT NULL DEFAULT 'pending',
    labeled_at          TIMESTAMPTZ,

    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_polled_at      TIMESTAMPTZ,
    poll_count          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tokens_status_launch ON tokens (status, launched_at DESC);
CREATE INDEX idx_tokens_pending_poll  ON tokens (last_polled_at) WHERE status = 'pending';
CREATE INDEX idx_tokens_crossed       ON tokens (crossed_10k_at DESC) WHERE crossed_10k_at IS NOT NULL;

-- tokens that died below 10K: counted, not stored individually
CREATE TABLE daily_universe (
    day                DATE PRIMARY KEY,
    minted_total       INTEGER NOT NULL DEFAULT 0,
    crossed_10k        INTEGER NOT NULL DEFAULT 0,
    crossed_30k        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE model_runs (
    id              BIGSERIAL PRIMARY KEY,
    ran_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    n_samples       INTEGER NOT NULL,
    n_positive      INTEGER NOT NULL,
    capacity_d      INTEGER NOT NULL,
    auc_mean        DOUBLE PRECISION NOT NULL,
    auc_std         DOUBLE PRECISION NOT NULL,
    epsilon_vc      DOUBLE PRECISION NOT NULL,
    auc_boot_lower  DOUBLE PRECISION NOT NULL,   -- see §7.3
    proven_floor    DOUBLE PRECISION NOT NULL,
    jar_level       DOUBLE PRECISION NOT NULL,   -- 0..1
    feature_importance JSONB NOT NULL,
    hour_rates      JSONB NOT NULL,
    notes           TEXT
);

CREATE TABLE ingest_log (
    id          BIGSERIAL PRIMARY KEY,
    at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    source      TEXT NOT NULL,          -- 'pumpfun' | 'dexscreener' | 'rpc'
    ok          INTEGER NOT NULL DEFAULT 0,
    failed      INTEGER NOT NULL DEFAULT 0,
    latency_ms  INTEGER
);
```

`daily_universe` matters. Without a count of everything minted, the site cannot state the true base rate, and the base rate is the most honest number on the page.

---

## 5. Token logos

Fetch once, at the moment a token crosses $10K.

Rules, all mandatory:

- **Never hotlink.** IPFS gateways time out and the feed will render with holes.
- **Cap the download** at 2 MB and 5 seconds. Some tokens ship an 8 MB PNG as a logo.
- **Resize to 64×64 WebP** and store in S3-compatible object storage (R2 is fine). ~3 KB each.
- **Fall back** to the generated initials chip already implemented in the prototype when fetch fails. It must never be a broken image.
- **Do not proxy arbitrary user URLs at request time.** Fetch server-side in the worker, on an allowlist of schemes (`https`, `ipfs`), with SSRF protection — block private IP ranges.

---

## 6. Content safety for lore

Token lore is arbitrary text written by strangers. Treat it as hostile input.

- Render with `textContent` / React text nodes only. **Never `innerHTML`.** The prototypes already do this; keep it.
- Strip zero-width and bidirectional control characters before storage.
- Truncate to 280 characters for display.
- Run a profanity/slur filter before display. Blocked tokens still enter the dataset — they are just shown as `[lore withheld]` in the public feed. Do not silently drop them from the model; that would bias the sample.
- Strip URLs from displayed lore. Scam links in a feed on your own homepage is a serious problem.

---

## 7. The model

### 7.1 Population and label

| | |
|---|---|
| **Universe** | every pump.fun mint |
| **Study population** | tokens whose peak market cap ever reached **$10,000** |
| **Positive label** | peak market cap reached **$30,000** |
| **Negative label** | reached $10K, did not reach $30K, and is now ≥48h old |
| **Pending** | reached $10K, younger than 48h — excluded from training |

Say this plainly on the site: the model answers *"given a token already reached $10K, will it reach $30K?"* — a conditional question, not a launch-day prediction.

### 7.2 Features

Only four families. Do not add more without updating this brief and the capacity parameter `d`.

| Feature | Source | Encoding |
|---|---|---|
| `launch_hour` | metadata | `sin`/`cos` of hour-of-day, 2 columns |
| `launch_dow` | metadata | one-hot, 7 columns |
| `holders` | RPC at label time | `log1p` |
| `lore` | metadata | sentence embedding → PCA to 24 dims |
| `lore_len` | metadata | word count |
| `lore_missing` | metadata | binary |
| `name_tokens` | metadata | word count |

Embedding model: `sentence-transformers/all-MiniLM-L6-v2` is sufficient and runs on CPU. Cache embeddings per mint; never recompute.

**Leakage checklist** — verify each before every training run:
- No feature derived from market cap, price, volume, or liquidity.
- `holders` sampled at a fixed 48h offset, never "current".
- No feature computed after the label was assigned.
- Time-based CV split as a sanity check alongside stratified CV: if AUC collapses when training on older tokens and testing on newer ones, the pattern is not stable and the jar must not fill.

### 7.3 Training and the jar

Model: `LGBMClassifier(n_estimators=400, learning_rate=0.03, class_weight="balanced", min_child_samples=40)`. 5-fold stratified CV, ROC-AUC.

The jar level is driven by the **proven floor**, which is the more conservative of two numbers:

```python
# 1. VC-style capacity penalty — the narrative device on the page
eps_vc = sqrt((d * (log(2*n/d) + 1) + log(4/delta)) / n)
floor_vc = auc_mean - eps_vc

# 2. Bootstrap lower bound — the actual statistical check
floor_boot = np.percentile(bootstrap_aucs, 2.5)   # 2000 resamples

proven_floor = min(floor_vc, floor_boot)
jar_level    = clamp((proven_floor - 0.50) / (0.60 - 0.50), 0, 1)
```

**Be honest in the code comments and on the site:** LightGBM does not have a clean VC dimension. `d` is an *effective capacity* parameter we choose and publish (currently 28, roughly the column count after PCA), not a derived quantity. The VC formula is the honest framing of a real idea — more capacity needs more data — but the bootstrap bound is what actually protects against overfitting. Presenting the VC bound as a rigorous guarantee would be a misrepresentation. Presenting it as the reason the jar fills slowly, alongside the bootstrap number, is fine and true.

Additional gates that must all pass before `jar_level` can reach 1.0:
- `n_samples >= 2000`
- `n_positive >= 200`
- `auc_std < 0.05` across folds
- time-split AUC within 0.04 of the stratified CV AUC

If any gate fails, cap `jar_level` at 0.95 and publish which gate failed. Users seeing "jar stuck at 95% because positives = 180" is a feature.

### 7.4 Schedule

Retrain hourly. Write one row to `model_runs` per attempt, including failed ones. The history table is public — expose it as a chart. A model whose AUC bounces wildly between hours is telling the audience something true.

---

## 8. API contract

### 8.1 WebSocket `wss://…/stream`

Server pushes JSON, one event per message.

```json
{ "type": "token",
  "data": {
    "mint": "7xK…",
    "name": "Midnight Janitor",
    "symbol": "MJ88",
    "lore": "Rescued from a dead Discord in 2021.",
    "lore_withheld": false,
    "logo": "https://cdn.emile.xyz/t/7xK.webp",
    "launched_at": "2026-09-04T20:14:03Z",
    "launch_hour": 20,
    "holders": 412,
    "peak_mc": 150300.0,
    "status": "passed"
  }}
```

```json
{ "type": "counters",
  "data": { "above_10k": 18432, "passed_30k": 2109, "stalled": 15904,
            "pending": 419, "median_holders": 288,
            "minted_today": 41207, "pulled_pumpfun": 41207,
            "priced_dexscreener": 18432, "rpc_holder_calls": 18013 }}
```

```json
{ "type": "model",
  "data": {
    "ran_at": "2026-09-04T21:00:00Z",
    "n": 18013, "n_positive": 2109, "d": 28,
    "auc": 0.647, "auc_std": 0.021,
    "epsilon_vc": 0.038, "auc_boot_lower": 0.612,
    "proven_floor": 0.609, "jar_level": 1.0,
    "gates": { "n_samples": true, "n_positive": true,
               "auc_std": true, "time_split": true },
    "blocked_by": null,
    "hour_rates": { "13": 0.19, "14": 0.22, "…": 0.0 },
    "feature_importance": { "holders": 0.51, "lore_pca_3": 0.08, "…": 0.0 }
  }}
```

```json
{ "type": "code",
  "data": { "stage": "holders · rpc", "line": "keep[\"holders\"] = sum(1 for a in accs if a.amount > 0)" }}
```

The `code` event is what drives the typing panel. **This must reflect real worker activity**, not a fixed script. Emit one event per meaningful step in each worker with the actual stage name and a representative source line. If a worker is idle, emit nothing and let the panel hold. A typing animation that runs when nothing is happening is theater; one that runs because a worker is running is a live log.

### 8.2 REST

| Endpoint | Returns |
|---|---|
| `GET /api/state` | full snapshot: latest 100 tokens, counters, latest model run. Used on page load before WS connects. |
| `GET /api/model/history?days=30` | array of `model_runs` rows for the AUC-over-time chart |
| `GET /api/tokens?status=passed&limit=100&cursor=…` | paginated browse |
| `GET /api/token/{mint}` | single token detail |
| `GET /api/dataset.csv` | **the full labeled dataset, downloadable** |
| `GET /api/methodology.json` | machine-readable version of §7: thresholds, feature list, `d`, gates |

`/api/dataset.csv` is not optional. It is the single strongest credibility signal the project has. Anyone can reproduce the AUC number and check whether the jar is honest. Rate-limit it, cache it hourly, but publish it.

---

## 9. Frontend

Port from `almost-surely-home.html`. Structure to preserve exactly:

1. **Hero scene** — Émile at his desk, monitor showing a miniature of the live code, jar to the left. The mini-screen must keep mirroring the same buffer as the large panel; that link is what sells the zoom.
2. **Magnified screen panel** — live code typing, then the three-source pull counters, then the token feed.
3. **The token feed is a signature element and must not be cut.** Name, symbol, lore, holders, peak cap, launch time, outcome. On phones, drop the peak column, not the lore. The client has specifically flagged the scrolling lore text as core to the page's feel.
4. **Stats strip** — above $10K, reached $30K, stalled, median holders.
5. **Proof panel** — the ε formula, the three readouts, the three sliders, the verdict line.

Keep the sliders in production. They let a visitor discover for themselves that a high AUC on a small sample does not fill the jar. That is the whole argument of the project, delivered by interaction instead of a paragraph.

### Known fix already applied

The syntax highlighter must tokenize in **one pass**. The earlier three-`replace` version let the string rule re-match `"c"` inside a `<span class="c">` it had just written, leaking raw markup on screen. If a new colour rule is added, add it as an alternation group in the `TOK` regex, never as a separate `.replace()`.

### Accessibility floor

Keyboard focus visible on all controls; `prefers-reduced-motion` honoured (already implemented — it swaps typing for whole-block reveals and disables idle animation); feed updates in an `aria-live="polite"` region with a pause control; colour contrast ≥ 4.5:1 for body text. The green-on-near-black CRT palette is close to the limit — verify with a checker, lighten `--dim` if it fails.

### Performance

Cap the DOM feed at 50 rows. Batch WS events through `requestAnimationFrame`. On a tab that has been backgrounded, drop queued token events rather than replaying thousands on return.

---

## 10. Émile — character and assets

### 10.1 Who he is

Émile is a monkey. He is named after **Émile Borel** (1871–1956), the French mathematician who formulated the infinite monkey theorem: a monkey hitting keys at random for long enough will, almost surely, type the works of Shakespeare. "Almost surely" is Borel's own technical term — an event of probability 1.

The joke that carries the whole project: pump.fun *is* the monkeys at the typewriters. Thousands of people throwing random names at the wall every day, and once in a while something sticks. Émile is the one monkey who decided to sit down and write the results in a notebook.

**Do not depict the historical Émile Borel.** Do not use his photograph, portrait, or likeness. Do not claim endorsement by his estate or any institution. The character is a monkey named in tribute; keep it that way.

### 10.2 Design direction for the artist

The prototype SVG is a placeholder, deliberately simple. The artist should redraw him properly and is free to reinterpret, staying inside these constraints:

**Personality.** Studious, tired, patient, unglamorous. He has been doing this for weeks. He is not excited, not smug, not a "chad". Closer to a night-shift librarian than a crypto mascot. The humour comes from how seriously he takes an absurd job.

**Silhouette.** Must read at 32×32 for a favicon and a token logo. Test every design at that size first. Distinguishing marks: round wire-rim spectacles, a slight forward hunch, one ear notched.

**Period.** Vaguely 1920s–30s French academic, dropped in front of a CRT monitor. That anachronism is the visual joke. A waistcoat, sleeves rolled, an enamel desk lamp. The monitor is a chunky beige CRT; the code on it is green phosphor.

**Palette.** Locked to the site tokens: fur `#7C6046`, highlight `#A8845E`, muzzle `#D9BD9B`, banana `#E9C24B`, phosphor green `#3FBF7F`, ink `#0A0E13`. Deviating breaks the composite with the live UI.

**Avoid.** Sunglasses, gold chains, laser eyes, rockets, "to the moon" iconography, any pose implying wealth or certainty. The entire brand position is that he does not know yet.

### 10.3 Illustration deliverables

| # | Asset | Format | Use |
|---|---|---|---|
| 1 | Émile at desk, 3/4 view from the right, typing | SVG + 2× PNG | hero scene, replaces prototype `<g id="emile">` |
| 2 | Émile bust, front, neutral | SVG | favicon, token logo, social avatar |
| 3 | Émile mid-toss, banana leaving hand | SVG | jar-fill moment |
| 4 | Émile asleep on the keyboard | SVG | empty state, error state, maintenance page |
| 5 | Émile holding a single banana, looking at it doubtfully | SVG | "jar blocked by gate X" state |
| 6 | The jar, empty, standalone | SVG | 0% state, OG image |
| 7 | Desk props: CRT, keyboard, lamp, notebook, coffee | SVG | scene set dressing, reusable |

**Rigging requirement.** Deliver asset 1 with these as separately named groups so the existing animation code can drive them without a rewrite: `#head`, `#eyes`, `#pup`, `#mouth`, `#armA`, `#handA`, `#armB`, `#handB`, `#tail`, `#body`. Shoulder pivot near the current coordinates (≈ 292, 306 in the 720×470 viewBox). Keep the same viewBox or supply a transform.

### 10.4 Video and motion

Deliver as **WebM with alpha channel (VP9)** plus an **MP4/HEVC fallback for Safari**, and a static WebP poster frame for every clip. Alternatively, Rive or Lottie for anything under ~200 KB — preferred for the loops, since they scale and stay crisp.

Total motion budget for the landing page: **under 1.5 MB**. Anything heavier gets lazy-loaded below the fold.

| Clip | Length | Loop | Description |
|---|---|---|---|
| **A. Typing loop** | 6 s | seamless | Émile typing steadily. Left and right hands at slightly different rhythms. Blink every 3–5 s, irregular. Tail sways once per cycle. Occasionally he pauses, adjusts his glasses, resumes. This is the default hero state and will play for as long as someone is on the page — irregularity is what stops it feeling robotic. |
| **B. Banana toss** | 1.5 s | one-shot | Triggered when `jar_level` rises. He reaches to the desk without looking away from the screen, lobs a banana over his shoulder into the jar, keeps typing. The casualness is the joke — this is his hundredth banana. |
| **C. Jar fill milestone** | 2 s | one-shot | Triggered at 25/50/75%. Camera holds on the jar, bananas settle, the level line ticks up, the percentage number rolls. No Émile in frame. |
| **D. Evolution** | 8–12 s | one-shot | Fires once, when `jar_level` hits 1.0. He stops typing. Looks at the full jar for a beat. Closes the notebook. Stands up. This must feel earned and slightly solemn, not triumphant — no fireworks, no rocket. Consider ending on him walking out of frame, leaving the monitor still running. |
| **E. Idle drowse** | 4 s | loop | For when the WebSocket is disconnected or workers are down. He dozes, head nodding. Doubles as the error state — a disconnected site that visibly *looks* disconnected is more trustworthy than one that keeps faking activity. |
| **F. OG / social loop** | 3 s | seamless | Square 1200×1200 crop for X and Telegram previews. Typing + one banana toss. |

**Motion rules.** Ease with overshoot on the banana arc, none on Émile's own movement — he is deliberate and a little heavy. Never animate the code panel and Émile at high energy simultaneously; one leads, one settles. Respect `prefers-reduced-motion`: swap every clip for its poster frame.

### 10.5 The "About Émile" page

The client wants Émile explained on the site. Structure:

1. **Borel's monkeys** — the theorem, in three sentences, plain language.
2. **Why it fits** — pump.fun as the room full of typewriters; thousands of random names a day; something sticks almost surely, and almost surely it means nothing.
3. **What Émile actually does** — the $10K gate, the $30K label, the four features, in plain language with the numbers live from `/api/methodology.json`.
4. **The jar** — why it fills slowly, what ε is, what the bootstrap bound is, and the explicit admission from §7.3 that `d` is a chosen capacity parameter and not a derived VC dimension.
5. **What he can't do** — the §1 "what Émile is not" list, verbatim, not softened.
6. **Check his work** — link to `/api/dataset.csv`, the model history chart, and the methodology JSON.

Section 5 should not be buried in a footer. On this page it goes above the fold on mobile.

---

## 11. Phase 2 — after the jar fills

Do not build this until phase 1 is live and the jar has actually filled. Specced here so architecture decisions today do not block it.

### 11.1 Key management — read before touching a wallet

An agent that launches tokens and claims fees needs a key it can use without a human. That is a permanent hot wallet. One compromised npm dependency in the scraper and it is gone.

Mandatory:
- **Two wallets.** Operational hot wallet holds only what is needed for the next 24 hours of gas and operations. Treasury is a **multisig (Squads)** requiring human approval for any transfer above a published threshold.
- **Signing service isolation.** The key lives in a separate process with no network access except to the RPC, no access to the scraper's dependency tree, and a hard-coded allowlist of instruction types it will sign. The web app cannot reach it.
- **Rate limits in code.** Maximum SOL out per hour, per day, per transaction. Exceeding it halts and pages a human.
- **KMS or HSM** for the key at rest. Not an environment variable. Not a file.
- **Kill switch.** A single documented command that revokes the operational key and halts all signing.

### 11.2 Treasury automation

Every rule must be **deterministic and published before it runs**. A bot that decides on its own when to buy back is indistinguishable from price manipulation and will be read that way.

Publish, then implement exactly:
- Fee claim: every N hours, unconditional.
- Buyback: fixed percentage of claimed fees, fixed schedule (e.g. every Friday 16:00 UTC), executed regardless of price.
- Burn: fixed percentage of bought-back supply, immediate, with transaction hash published.
- No discretionary branch anywhere. No "if price is low, buy more".

Every treasury action writes a row to a public `treasury_log` table exposed at `/api/treasury`, with transaction signature.

### 11.3 X automation

**Permitted:**
- Posting on-chain actions after the fact, with transaction signature. `"Claimed 4.2 SOL. Bought back 1.1M $EMILE. Burned. tx: …"`
- Daily research log: tokens scanned, current AUC, jar level — including when the numbers got worse.
- Model run summaries, negative results included.

**Prohibited:**
- Price-triggered posts.
- Auto-replies encouraging purchase.
- Any claim of predictive edge.
- Follow/reply automation for engagement. This violates X's platform manipulation rules and gets accounts suspended.

**Disclosure:** the account holds the token and receives fees. State it in the bio and in any post that could be read as promotional. "A bot wrote it" is not a defence in any jurisdiction. The operator is responsible.

Rate limit to a hard maximum of 6 posts per day. Queue and drop rather than burst.

---

## 12. Milestones

| Phase | Deliverable | Gate to proceed |
|---|---|---|
| **0** | Schema, ingest worker, DexScreener poller. No UI. | 48h of clean data, peak_mc tracking verified against manual spot-checks |
| **1** | Label worker, holder sampling, `daily_universe` counts | base rate computed and plausible |
| **2** | Training job, `model_runs`, jar computation | first AUC published, gates evaluated correctly |
| **3** | API server, WebSocket, `/api/dataset.csv` | dataset downloadable and reproduces published AUC |
| **4** | Frontend port, live | passes accessibility floor, reduced-motion verified |
| **5** | Émile assets integrated, About page | client sign-off on character |
| **6** | Phase 2, only if jar filled | security review of key management complete |

---

## 13. Non-negotiables

1. Tokens that died below $10K are counted in `daily_universe`. The base rate is published.
2. `/api/dataset.csv` is public.
3. The jar reflects `proven_floor`. There is no code path that advances it on a timer.
4. When a gate blocks the jar, the site names the gate.
5. Negative results are published on the same page as positive ones.
6. No copy anywhere claims price prediction or an edge.
7. Lore is rendered as text, never as HTML.
8. Phase 2 does not start before the security review in §11.1.

If a change request conflicts with any item on this list, escalate rather than implement.
