# Émile Daily — Launch Protocol

## Developer brief

Version 1.0. Companion to `emile-launch-log-section.html`.

Émile selects one candidate from the hundred he generated that cycle, publishes
the survival probability his model assigns to it, deploys it on Pons V2, and
records the outcome forty-eight hours later under the same labelling rule as
every other token in his dataset.

---

## 0. What this is, and what it is not

**It is a pre-registered prediction, repeated daily.**

Pre-registration — stating the prediction before the outcome exists — is the
standard that separates a result from a story told afterwards. Almost nothing in
this industry is pre-registered. Doing it 365 times a year, publicly, with every
input and every score published, produces something that does not currently
exist anywhere on chain: a calibration record for an agent.

**It is not Evolution 2.** These are experiment tokens launched with minimal
liquidity from a separate wallet. Evolution 2 is a single token, capital-backed
from accumulated creator fees, and it remains gated on the proven floor clearing
0.600 for 24 consecutive runs. Nothing in this document unlocks it, and the
creator fee treasury is not touched by this protocol.

**It is not a recommendation.** Émile's proven floor is −0.1420. A predicted
survival probability of 0.81 means his model ranks that candidate above the
other ninety-nine, and his model has not earned the right to be believed.

---

## 1. Three constraints that shape the design

### 1.1 Launched tokens must not enter the training set

This is the one that will silently destroy the model if it is missed.

Émile launches a token. The ingest worker sees it on chain like any other token.
The label worker resolves it at 48h. It enters `tokens`, and the next retrain
learns from it.

Now Émile is training on his own behaviour. His launch-hour preference becomes
self-confirming, because every token he launches is at his preferred hour.
Within weeks the feature importances describe his own habits rather than the
market.

**Required:** every launched token carries `emile_launched = true`, and the
training query filters it out.

```sql
ALTER TABLE tokens ADD COLUMN emile_launched BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX tokens_emile_launched_idx ON tokens (emile_launched) WHERE emile_launched;
```

```python
# training set — the filter is not optional
df = read_sql("""
    SELECT * FROM tokens
    WHERE status IN ('passed','stalled')
      AND emile_launched = false
""")
```

Add a regression test that fails if a launched mint appears in a training batch.

### 1.2 The fee treasury is not the launch wallet

We published that creator fees do not move before Evolution 2. Daily launches
funded from that wallet would break it in public, on chain, within a day.

Two wallets, separate keys, separate published addresses:

| Wallet | Purpose | Spends |
|---|---|---|
| Treasury (Squads 3-of-5) | Evolution 2 capital | Never, until the gate opens |
| Experiment wallet | Daily launch liquidity and gas | Daily, capped |

Publish both addresses. The whole value of the treasury claim is that anyone can
watch it not move.

### 1.3 Volume discipline

One token a day is 365 a year. That is a meaningful footprint on any chain, and
the difference between an experiment and a spam operation is entirely in whether
each one is accompanied by a published prediction and a resolved outcome.

**Required:** if the previous day's launch has not resolved and published, the
next day's launch does not fire. The protocol cannot run ahead of its own
record-keeping.

---

## 2. Daily sequence

Fixed UTC time, once per day. Every step logged.

```
T-10m   select      pick the candidate (see §3)
T-5m    pre-register publish prediction, commitment, candidate set link
T-0     deploy      Pons V2, then liquidity, then LP burn, then renounce
T+60s   publish     every transaction hash
T+48h   resolve     label by peak market cap; publish outcome
T+48h   recalibrate update Brier score and calibration curve
```

Pre-registration must complete and be publicly readable before the deploy
transaction is broadcast. If publication fails, the launch aborts. A prediction
published after deployment is worth nothing.

---

## 3. Selection

```python
def select(candidates: list[Candidate]) -> Candidate | None:
    eligible = [
        c for c in candidates
        if not already_deployed_elsewhere(c.name)
        and not launched_by_emile_before(c.name)
        and content_filter.allows(c.name, c.lore)
    ]
    if not eligible:
        return None          # no launch today; publish why
    return max(eligible, key=lambda c: c.score)
```

Deterministic argmax. No tie-break randomness — on an exact tie, take the lower
rank index, which is stable given the seeded generation.

**No human may edit, veto, or substitute the selection.** The content filter ran
before scoring in the generation step; it runs again here only as a guard against
a name that became problematic between cycles, and any rejection at this stage is
logged with its reason.

If `select` returns `None`, publish a no-launch notice with the reason. A skipped
day is a result.

---

## 4. Token parameters

Fixed, identical every day. Varying them would add a variable the model was never
trained on and make the daily series incomparable.

| Parameter | Value |
|---|---|
| Venue | Pons V2, Robinhood Chain |
| Supply | 1,000,000,000 |
| Decimals | 18 |
| Buy / sell tax | 0% / 0% |
| Ownership | Renounced in the deploy transaction |
| Mint function | Absent from bytecode |
| Émile's allocation | 0 |
| Liquidity | Fixed amount, published in advance |
| LP tokens | Burned to `0x…dEaD` in the same block |

Confirm against Pons V2's actual deployment interface before building. If Pons
handles pooling and LP treatment itself, document exactly what it does rather
than assuming it matches this table — and if its behaviour differs, the table
changes and the change is published.

### 4.1 Liquidity sizing

Small and constant. Enough for the token to be tradeable and for peak market cap
to be measurable; not so much that a failed prediction is expensive.

Publish the number before the first launch and do not change it without
announcing the change and marking the discontinuity in the series.

---

## 5. Schema

```sql
CREATE TABLE launches (
  launch_id        BIGSERIAL PRIMARY KEY,
  day_index        INTEGER NOT NULL UNIQUE,
  cycle_id         BIGINT NOT NULL REFERENCES idea_cycles(cycle_id),
  run_id           BIGINT NOT NULL REFERENCES model_runs(id),
  candidate_id     BIGINT NOT NULL REFERENCES idea_candidates(id),

  name             TEXT NOT NULL,
  symbol           TEXT NOT NULL,
  lore             TEXT NOT NULL,
  launch_hour      SMALLINT NOT NULL,
  rank_in_cycle    INTEGER NOT NULL,

  predicted_prob   NUMERIC(8,6) NOT NULL,
  prediction_sha   TEXT NOT NULL,
  prediction_at    TIMESTAMPTZ NOT NULL,

  mint             TEXT UNIQUE,
  deploy_tx        TEXT,
  pool_tx          TEXT,
  lp_burn_tx       TEXT,
  renounce_tx      TEXT,
  deployed_at      TIMESTAMPTZ,
  liquidity_wei    NUMERIC(40,0),

  peak_mc          NUMERIC(18,2),
  holders_48h      INTEGER,
  outcome          TEXT,               -- 'pending' | 'passed' | 'stalled'
  resolved_at      TIMESTAMPTZ,

  contributions    JSONB,              -- per-feature contribution, see §6
  skipped_reason   TEXT                -- set when no launch occurred
);
```

Append-only. `prediction_at` must be strictly earlier than `deployed_at`; enforce
with a check constraint. Reveal-style columns transition once and never change.

---

## 6. "Why this one"

The section shows per-feature contributions for the selected candidate. Compute
with SHAP or the model's own contribution output — not by re-deriving from global
feature importance, which describes the model in general rather than this
prediction.

```json
"contributions": [
  { "feature": "launch_hour_cos", "label": "Launch hour 14:00 UTC", "value": 0.211 },
  { "feature": "lore_length",     "label": "Lore length 71 characters", "value": 0.094 },
  { "feature": "name_tokens",     "label": "Name token count 2", "value": 0.038 },
  { "feature": "holders",         "label": "Holder count (held at median)", "value": 0.000 }
]
```

Always include the holder-count row even though it is zero. It shows the reader
that the strongest feature in the model played no part in this choice, because it
is pinned at the median for every candidate. Omitting it would make the
explanation misleading by absence.

The prose beneath is hand-written, tied to a `launch_id`. Do not generate it. A
template that writes "the model chose this for its strong name signal" will
eventually write something the contributions contradict.

---

## 6.5 Corrections to the built section

These are defects found in the first implementation. Each one makes the page say
something the data does not support, which is the failure mode this project
cannot afford.

### 6.5.1 Remove the manual CA input from the public page

**Current:** a "Paste CA Mint Address" field with a "Submit CA & start 48h track"
button sits inside the launch card.

**Problem:** it puts a human hand in the middle of a sequence the page describes
as autonomous. A visitor who sees that field concludes, correctly, that someone
is typing the contract address in by hand. It contradicts the protocol on the
same screen that explains the protocol.

**Required:** the mint address comes from the receipt of the deploy transaction
the worker itself broadcast. The 48-hour track starts from `deployed_at`, which
is the block timestamp of that transaction.

If manual entry is still needed during the bring-up period, move it behind an
authenticated admin route. It must not be reachable from, or visible on, the
public page — not disabled, not hidden with CSS. Not served.

### 6.5.2 Calibration must refuse to conclude at small n

**Current:** Brier 0.3412 in red, with `Overconfident` in red beside it, computed
from five resolved launches.

**Problem:** five points cannot support a claim about calibration direction. One
different outcome swings it. Rendering a conclusion in alarm-red from five
samples is the same error as a jar reading 80% above a negative floor.

**Required:**

```python
MIN_RESOLVED_FOR_DIRECTION = 20

if n_resolved < MIN_RESOLVED_FOR_DIRECTION:
    direction = "insufficient data"
    brier_display = "muted"     # --dim, never --stall
else:
    direction = "overconfident" if predicted_sum > actual_sum else "underconfident"
```

Below the threshold the cell reads `insufficient data` in `--dim`, with a
subtitle giving the count needed. The Brier number still displays — it is a real
computation — but in `--dim`, without a colour that implies a verdict.

The same rule governs the calibration curve. Do not draw a line through three
buckets. Below the threshold, render the axes and a line of copy saying how many
resolutions are still required.

### 6.5.3 Contribution bars must be proportional to value

**Current:** the `Holder count (held at median)` row shows a full-width bar
beside a value of `+0.000`.

**Problem:** it reads as the dominant reason for the selection. The truth is the
opposite — holder count carries the largest share of the model's global signal
and contributed nothing at all to this choice, because it is pinned at the
median for all one hundred candidates. The bar inverts the single most important
thing that row exists to communicate.

**Required:** bar width is `abs(value) / max(abs(all values))`, with a 1px
minimum so a zero row is still visible as a row. Negative contributions render
in `--stall` and extend from the same origin.

Keep the row. Removing it would be misleading by omission. Draw it honestly and
it becomes the most informative line on the card.

### 6.5.4 Body text contrast

**Current:** the section intro and the two closing notes render in a dim grey
close to `--dim` on `--ink`.

**Required:** `--dim` is for labels, units, and secondary metadata only. Any
sentence a reader is expected to read in full uses `--fg`. Both closing notes —
training-data exclusion and zero allocation — are load-bearing and must be
readable on a phone in daylight. Verify 4.5:1 against `--ink` at the rendered
size.

### 6.5.5 Naming: daily launches are not part of 1.5

**Current:** the header shows `PHASE 1.5 · DAILY LAUNCHES`.

**Problem:** Evolution 1.5 generates and publishes ideas. It launches nothing —
that is stated in its own brief as a non-negotiable. Attaching daily launches to
the 1.5 label makes the phase boundaries meaningless, and the phase boundaries
are what keep Evolution 2's gate credible.

**Required:** this protocol is named separately. Suggested: `ÉMILE DAILY`. The
header carries it on its own, with no version number attached to it. Evolution 2
remains the single capital-backed launch behind the proven-floor gate, and
nothing on this page may imply that daily launching satisfies or approaches it.

### 6.5.6 Simulated-data marker

While any figure on the page is simulated, the marker stays visible at the top of
the section, not only in the footer, and no screenshot of the page is published
without it in frame.

When real data lands, the marker is removed entirely rather than reworded. A
softened disclaimer is worse than none, because it reads as a formality instead
of a warning.

---

## 7. Calibration

The real output of this protocol. Recomputed on every resolution.

```python
brier = mean((predicted_prob - outcome) ** 2)   # outcome ∈ {0, 1}
```

Reference points to publish alongside it, because a Brier score alone is
uninterpretable:

- Always predicting the base rate (~0.276) scores about 0.200.
- Always predicting 0.5 scores 0.250.
- Perfect prediction scores 0.

Also publish a calibration curve: bucket predictions into deciles and plot
predicted against observed frequency. With a handful of launches the buckets are
nearly empty and the curve is meaningless — say so on the page rather than
drawing a confident-looking line through three points.

Label the direction plainly: `overconfident`, `underconfident`, or
`insufficient data`. Below 20 resolved launches the label is always
`insufficient data` and the Brier value renders in `--dim`. See §6.5.2; this is
not a display preference but a correctness requirement.

---

## 8. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/launches` | Full log, most recent first, including skipped days |
| `GET /api/launches/{day_index}` | One launch with contributions and all tx hashes |
| `GET /api/launches/calibration` | Brier, curve buckets, reference points, direction |
| `GET /api/launches/pending` | The pre-registered prediction for a launch not yet resolved |

All public, no auth. `/api/launches/pending` exists so that anyone can see the
prediction before the outcome, which is the entire point.

---

## 9. Safety

- Experiment wallet holds only what is needed for one launch; topped up from the
  multisig on a schedule, never automatically drained.
- Signing service accepts four transaction shapes: deploy, add liquidity, burn
  LP, renounce. Nothing else is signable.
- Rate limit at the signing layer: one launch sequence per 20 hours, independent
  of the scheduler. A scheduler bug cannot produce a loop.
- Operator halt stops the daily sequence. As in the 2.0 spec, humans may halt and
  may never trigger.
- If any step of the sequence fails after deployment, the sequence completes the
  remaining steps or publishes exactly where it stopped. A half-launched token
  with unburned LP is the worst outcome and must be visible immediately.

---

## 10. Non-negotiables

1. Prediction published before deployment, always. Failure to publish aborts.
2. Launched tokens carry `emile_launched = true` and never enter training data.
3. The creator fee treasury is untouched by this protocol.
4. Émile holds zero of every token he launches.
5. No human edits, vetoes, or substitutes a selection.
6. Outcomes published whether or not they flatter the model — including the
   confident wrong ones, which are the useful ones.
7. Every score displayed carries the current proven floor beside it.
8. If yesterday is unresolved and unpublished, today does not launch.
9. No manual input sits anywhere in the public launch path. The mint address
   comes from the worker's own deploy receipt.
10. No calibration verdict below 20 resolved launches. `insufficient data` is
    the honest label and it is used.
11. Contribution bars are proportional to their values, including zero ones.
12. This protocol is named separately from Evolution 1.5, and nothing on the page
    implies it advances the Evolution 2 gate.
