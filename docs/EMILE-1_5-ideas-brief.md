# Émile 1.5 — Autonomous Idea Generation

## Developer brief

Version 1.5.0. Companion to `emile-ideas-section.html`, which is the target
design with browser-generated demo data in it.

Émile 1.5 sits between Evolution 1 (learning) and Evolution 2 (launching). He
writes token ideas, scores them with his own model, and revises the ranking
every hour. **He launches nothing in 1.5.**

---

## 0. The disclosure decision

Every candidate is public, including the leader. Nothing is hidden, blurred, or
withheld until launch.

This is a deliberate choice with a known cost, and the cost should be planned
for rather than discovered:

- The top-ranked name will probably be deployed by somebody else before Émile
  gets there. Possibly several times.
- A stolen name may enter Émile's own dataset through the normal ingest path.
- Émile therefore may launch a lower-ranked candidate than the one he wrote
  first.

Two mechanisms make that survivable, and neither reduces openness:

**Timestamped commitment.** Each candidate is hashed and written to an
append-only log at generation time, before it is rendered. The hash is published
alongside the plaintext. It proves priority, not secrecy.

**Automatic exclusion.** Any candidate whose name has since been deployed by
another address is dropped from the next cycle. Émile launches an idea that is
still his, or he launches nothing.

The theft history is itself worth publishing. A log showing Émile wrote a name
at 09:00 and a stranger deployed it at 09:40 is a better argument for the
project than the launch would have been.

---

## 1. Generation

### 1.1 Cycle

One cycle per model retrain, hourly. Exactly 100 candidates per cycle, tied to
the `run_id` of the model that scored them.

### 1.2 Determinism

The RNG is seeded from `sha256(run_id)`. Anyone holding the model artifact and
the run id can regenerate the identical candidate set and reproduce every score.

This is the point of the whole section. Publish the seed and the scoring stops
being a claim about what Émile did and becomes something a stranger can check.

### 1.3 Candidate

```python
@dataclass(frozen=True)
class Candidate:
    name: str          # <= 32 chars
    lore: str          # <= 280 chars
    hour: int          # 0-23, UTC
    score: float       # model.predict_proba(...)[0][1]
```

Holder count is pinned at the dataset median for tokens that cleared $10K, so
the three features Émile controls are the only ones varying. Store which median
was used; it moves as the dataset grows, and an old cycle must remain
reproducible with the median it actually used.

### 1.4 Content filter — before scoring, never after

Reject a candidate containing: a real person's name, a protected mark, any claim
about returns or price, an impersonation of an existing project or ticker, or
anything a reasonable reader would take as a financial promise. Also reject
near-duplicates of names already present in the `tokens` table.

Filtering after scoring would let the filter quietly shape the ranking. Reject
first, then score. Publish the rejection count per cycle; the filter list is
served at `/api/ideas/filter`.

### 1.5 Deduplication and exclusion

- Case-folded name uniqueness within a cycle.
- Across cycles, repeats are allowed. A name reappearing is a signal worth
  keeping.
- **Excluded:** any name matching a token already deployed on Robinhood Chain by
  an address other than Émile's. Checked against the `tokens` table at
  generation time. Log the exclusion with the deployer address and the block
  number — this is the theft record.

---

## 2. Schema

```sql
CREATE TABLE idea_cycles (
  cycle_id       BIGSERIAL PRIMARY KEY,
  run_id         BIGINT NOT NULL REFERENCES model_runs(id),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  generator_sha  TEXT NOT NULL,        -- git sha of ideas.py as deployed
  model_version  TEXT NOT NULL,
  seed           TEXT NOT NULL,        -- sha256(run_id)
  median_holders INTEGER NOT NULL,
  n_generated    INTEGER NOT NULL,
  n_rejected     INTEGER NOT NULL,     -- content filter
  n_excluded     INTEGER NOT NULL      -- already deployed elsewhere
);

CREATE TABLE idea_candidates (
  id           BIGSERIAL PRIMARY KEY,
  cycle_id     BIGINT NOT NULL REFERENCES idea_cycles(cycle_id),
  rank         INTEGER NOT NULL,
  name         TEXT NOT NULL,
  lore         TEXT NOT NULL,
  hour         SMALLINT NOT NULL,
  score        NUMERIC(8,6) NOT NULL,
  commitment   TEXT NOT NULL,          -- hex sha256, see 3.1
  committed_at TIMESTAMPTZ NOT NULL,
  image_sha    TEXT,
  UNIQUE (cycle_id, rank)
);

CREATE TABLE idea_exclusions (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  first_cycle   BIGINT NOT NULL,       -- when Emile first wrote it
  first_seen_at TIMESTAMPTZ NOT NULL,
  deployed_mint TEXT NOT NULL,
  deployer      TEXT NOT NULL,
  deployed_at   TIMESTAMPTZ NOT NULL,
  block_number  BIGINT NOT NULL
);

CREATE INDEX idea_candidates_cycle_idx ON idea_candidates (cycle_id, rank);
CREATE INDEX idea_candidates_name_idx  ON idea_candidates (lower(name));
```

All three tables are append-only. Revoke `UPDATE` and `DELETE`:

```sql
REVOKE UPDATE, DELETE ON idea_cycles, idea_candidates, idea_exclusions FROM app_user;
```

A candidate row is never edited. If a cycle was wrong, write a new cycle and say
why. Editing history here destroys the only thing the commitment log is for.

---

## 3. The commitment log

### 3.1 Construction

```
commitment = sha256(name ‖ 0x1f ‖ lore ‖ 0x1f ‖ hour ‖ 0x1f ‖ run_id)
```

Use an explicit separator byte between fields. Without one,
`("ab", "c")` and `("a", "bc")` produce the same digest, and the log becomes
forgeable.

No nonce. Nothing is being hidden, so there is nothing to protect against a
dictionary attack. The hash exists to fix a timestamp, not to conceal.

### 3.2 Ordering

Write the commitment **before** the candidate is exposed by any endpoint. The
sequence is: generate, filter, score, commit, then serve. A candidate that
appears in an API response without a prior log entry is a bug and should raise.

### 3.3 Anchoring (recommended, phase 2)

A database the team controls is weak evidence of priority. Once a day, publish
the Merkle root of that day's commitments in a single on-chain transaction from
Émile's wallet. The cost is one cheap transaction; the gain is that priority
becomes provable to someone who does not trust the team at all.

Until anchoring ships, describe the log honestly as "our record", not as proof.

---

## 4. Endpoints

All public, no auth, `Cache-Control: public, max-age=30`.

### `GET /api/ideas/current`

Powers the live panel. Returns all 100.

```json
{
  "cycle_id": 1418,
  "run_id": 444,
  "generator_sha": "4f1c9ae",
  "started_at": "2026-09-11T09:00:00Z",
  "seed": "8c2f…",
  "median_holders": 1168,
  "n_generated": 100,
  "n_rejected": 14,
  "n_excluded": 2,
  "model": {
    "auc": 0.4376,
    "vc_penalty": 0.5797,
    "proven_floor": -0.1420,
    "confidence": "none"
  },
  "candidates": [
    {
      "rank": 1,
      "name": "Sherwood Index",
      "lore": "Counting what the forest already knew.",
      "hour": 14,
      "score": 0.8117,
      "commitment": "a91f7c2e…",
      "committed_at": "2026-09-11T09:00:04Z"
    }
  ]
}
```

Candidates ordered by rank ascending. Never truncate the array — the page shows
all 100 and the count is part of the claim.

### `GET /api/ideas/cycle/{cycle_id}`

Any historical cycle, same shape.

### `GET /api/ideas/eliminated?limit=50`

Candidates that held rank 1 in an earlier cycle and no longer do. This is the
page's best material — Émile changing his mind, with timestamps.

```json
[
  { "name": "Quiver", "lore": "…", "led_cycle": 1402, "peak_score": 0.7431,
    "current_score": 0.5118, "current_rank": 37, "demoted_cycle": 1409 }
]
```

### `GET /api/ideas/exclusions`

The theft record. Every name Émile wrote that someone else deployed first, with
deployer, block number, and the gap in seconds between his commitment and their
deployment.

### `GET /api/ideas/commitments?from=&to=`

The append-only log, ordered, one entry per line. Include the Merkle root and
anchoring transaction once §3.3 ships.

### `GET /api/ideas/generator`

Returns the **actual source** of `ideas.py` from the running worker, plus its
git sha and the sha of the deployed image.

The code panel renders this response. It must not render a hardcoded string.
A code panel animating a script nobody executes is decoration, and this project
does not ship decoration.

Serve from a read-only mount of the deployed file, not from the repository. If
the served sha and the worker's reported sha diverge, render the mismatch
instead of hiding it.

---

## 5. Frontend requirements

### 5.1 Confidence is attached to every score

No score appears anywhere without the current proven floor beside it. Today:

> Measured AUC 0.4376, proven floor −0.1420. A score of 0.81 does not mean this
> token is likely to survive. It means the model ranks it above the others, and
> the model has not yet earned the right to be believed.

Driven by `model.confidence`, computed server-side:

| Proven floor | Label |
|---|---|
| < 0 | `none` |
| 0 to 0.55 | `weak` |
| >= 0.55 | `provisional` |
| >= gate, streak held | `qualified` |

This is the most important element on the page. Without it the section reads as
Émile issuing predictions, which is exactly what the project says it does not do.

### 5.2 The list

All 100, scrollable, ranked. Rank 1 marked but not celebrated — a left rule, not
a trophy. Each row carries name, lore, launch hour, score, and a truncated
commitment hash that expands on click.

Virtualise the list if scroll performance suffers; 100 rows should not need it.

### 5.3 Distribution over leaderboard

The histogram is not a secondary widget. A model with nothing to say produces a
narrow distribution around the base rate; as it learns, the right tail stretches.
That shape change is the real story of 1.5, and it should be given equal visual
weight to the ranked list.

### 5.4 Empty and failure states

| Situation | Behaviour |
|---|---|
| Cycle in progress | Show partial list with the live count. Do not pad to 100. |
| Fetch fails | Last successful payload with a visible staleness timestamp. |
| No cycles yet | Axes and copy, no skeleton that resembles data. |

### 5.5 Reduced motion

Typing animation and cycle ticker both stop under `prefers-reduced-motion`. The
code panel then shows the full source statically.

---

## 6. Images

Generated for the top-ranked candidate of each cycle, published immediately
along with everything else.

- Store the image, record `image_sha` on the candidate row.
- Record the generation prompt and the model used. It becomes part of the audit
  trail and someone will ask.
- Same content bounds as §1.4, plus: no real people, no existing logos,
  characters, or licensed IP.
- Cap generation cost per cycle. At hourly cycles this runs 8,760 times a year.
- If generation fails, the candidate ships without an image. Never substitute a
  placeholder that could be mistaken for a generated one.

---

## 7. What 1.5 must never do

1. Launch anything. That is 2.0 and it has its own gate.
2. Display a score without the confidence label.
3. Let a human edit, promote, demote, or veto a candidate. The filter runs
   before scoring; the ranking belongs to the model.
4. Re-score an old cycle with a new model and overwrite the old score. New
   model, new cycle.
5. Serve a candidate that has no commitment log entry.
6. Ship a single synthetic or seeded row. The `dataset.csv` endpoint already
   shipped with seeded rows once; this must not repeat.

---

## 8. Acceptance checklist

- [ ] Cycles reproducible from `sha256(run_id)`, scores identical on replay
- [ ] Content filter runs before scoring; rejections counted and published
- [ ] Commitment uses explicit field separators
- [ ] Commitment written before any endpoint can expose the candidate
- [ ] All three tables append-only, `UPDATE`/`DELETE` revoked
- [ ] Names deployed by other addresses excluded from the next cycle
- [ ] `/api/ideas/exclusions` populated and public
- [ ] `/api/ideas/generator` serves the deployed file, sha-matched to the worker
- [ ] Confidence label on every surface that shows a score
- [ ] All 100 candidates returned, never truncated
- [ ] Histogram given equal weight to the ranked list
- [ ] No synthetic rows in any response
- [ ] Daily Merkle anchor scheduled (phase 2) or the log described as "our record"
