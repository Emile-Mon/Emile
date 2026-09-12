# Émile 2.0 — Pre-Launch Section

## Developer brief, revision 2

Replaces the launch-log build shown in the current screenshot. Companion to
`EMILE-daily-launch-brief.md`, which still governs the protocol; this document
governs only what the page shows **before the first token is deployed**.

---

## 0. What changes and why

The current section renders a full launch log: seven entries, a calibration
strip with a Brier score, and an "actual survivors" count.

None of those exist yet. Zero tokens have been deployed. Every figure on that
page is placeholder content, and the layout is shaped around a history that has
not happened.

**The section is reduced to one thing: the token currently preparing to launch,
and the prediction committed for it.**

This is not a smaller version of the same page. It is the honest version. A
calibration score computed from nothing is worse than no calibration score, and
a log of seven invented launches on a site whose whole claim is a public record
is the single most damaging thing that could ship here.

Everything else returns when it has data behind it. See §5.

---

## 1. What the section contains

In order, top to bottom:

1. **One pre-launch card.** The selected candidate, its committed prediction,
   and its authorship split.
2. **Feature contributions.** Why the model ranked this candidate first.
3. **Two standing notes.** Training-data exclusion and zero allocation.

Nothing else. No calibration strip. No log. No "most recent first" header with
one row under it.

If no candidate is currently prepared, the section shows a single line stating
that, with the reason, and nothing else. A skipped day is a result and displays
as one.

---

## 2. The pre-launch card

### 2.1 Required fields

| Field | Source | Notes |
|---|---|---|
| Name | see §3 | |
| Symbol | derived | |
| Lore | model | full text, never truncated |
| Launch hour | model | UTC |
| Rank in cycle | `idea_candidates.rank` | "1 of 100" |
| Predicted survival | `launches.predicted_prob` | four decimals |
| Commitment hash | `launches.prediction_sha` | full, expandable |
| Commitment time | `launches.prediction_at` | UTC, to the second |
| Liquidity | `launches.liquidity_wei` | published before deploy |
| Émile's holding | constant | `0` |
| Status | derived | `PREPARING — AWAITING DEPLOYMENT` |

### 2.2 Ordering guarantee

`prediction_at` must render, and must be visibly earlier than any deployment
timestamp. This ordering is the entire claim of the section. If the card can
render without a commitment time, the claim is unverifiable and the card is
wrong.

The card does not appear at all until a commitment exists in the log.

### 2.3 No manual input

The "Paste CA Mint Address" field is removed from the public page — not
disabled, not hidden with CSS. Not served. The mint address arrives from the
receipt of the worker's own deploy transaction.

If manual entry is still required during bring-up, it lives behind an
authenticated admin route on a separate path.

---

## 3. Authorship disclosure

This is new and it is required.

The model controls three of its four features. If a human chooses any of them,
the page says which.

```json
"authorship": {
  "name":  "human",
  "lore":  "model",
  "hour":  "model",
  "holders": "market"
}
```

Rendered as a short line under the token name, in `--dim`:

> Name chosen by us. Lore and launch hour chosen by the model. Holder count
> belongs to the market.

### 3.1 Why this matters more than it looks

Name contributes roughly 1–4% of the model's signal. Launch hour carries about
40%. A human picking the name costs almost nothing in predicted score, which is
exactly why it is tempting to do quietly.

Do not do it quietly. A visitor who assumes the whole token was model-generated
and later learns otherwise has been misled, and the correction is not
recoverable. Stating the split costs one line and makes the rest of the card
believable.

If a future launch is fully model-authored, the line says so. The field is never
omitted.

---

## 4. Feature contributions

Per-prediction contributions from SHAP or the model's own contribution output.
Not global feature importance — that describes the model in general, not this
choice.

Corrections from the previous build that still apply:

- **Bar width is proportional to `abs(value)`**, normalised against the largest
  contribution in the set, with a 1px floor. The current build draws the
  `Holder count (held at median)` row at near-full width beside a value of
  `+0.000`, which inverts the meaning of the most informative row on the card.
- **Keep the zero row.** Holder distribution carries the majority of the model's
  global signal and contributed nothing here, because it is pinned at the
  dataset median for all hundred candidates. Removing it would mislead by
  omission.
- Negative contributions render in `--stall` from the same origin.

The prose beneath is hand-written and tied to a `launch_id`. Never generated.

---

## 5. What returns, and when

| Element | Appears when |
|---|---|
| Outcome on the card | 48h after deploy, labelled by the standard rule |
| Launch log | 2 or more resolved launches |
| Brier score | 5 or more resolved launches, rendered in `--dim` |
| Calibration direction | 20 or more resolved launches |
| Calibration curve | 20 or more resolved launches |

Below each threshold the element is **absent**, not greyed out and not showing
`—`. An empty container implies data is coming; absence implies nothing.

The single exception: once the first launch resolves, its outcome appears on its
own card immediately, including when the prediction was badly wrong. That case
is the most valuable thing this section will ever display.

---

## 6. Standing notes

Both remain, both in `--fg` rather than `--dim`. They are load-bearing and must
be readable on a phone.

1. Launched tokens carry `emile_launched = true` and never enter training data.
2. Émile holds zero. Liquidity comes from a separate experiment wallet; the
   creator fee treasury is untouched and reserved for Evolution 2.

---

## 7. Naming and scope

The header reads `ÉMILE DAILY`, with no version number attached.

Nothing on this page may state or imply that a daily launch advances the
Evolution 2 gate. Evolution 2 is one capital-backed launch behind seven
conditions held for 24 consecutive runs, and today that function returns false
with six blocking reasons.

If both are visible in the same viewport, the Evolution 2 gate state renders
beside the daily card so the distinction is unavoidable.

---

## 8. Demo marker

While any figure is placeholder, the marker stays at the top of the section and
appears in every screenshot published.

When live data lands, the marker is deleted rather than softened. A reworded
disclaimer reads as a formality; its absence should mean the numbers are real.

---

## 9. Acceptance checklist

- [ ] Launch log, calibration strip and Brier score removed until §5 thresholds
- [ ] Section renders exactly one card, or a no-launch line with its reason
- [ ] Card does not render without a commitment log entry
- [ ] `prediction_at` displayed to the second
- [ ] Authorship line present, listing every feature and its source
- [ ] Manual CA input not served on any public route
- [ ] Contribution bars proportional, zero row retained, negatives in `--stall`
- [ ] Standing notes in `--fg`, contrast verified at rendered size
- [ ] No version number attached to the daily-launch header
- [ ] Demo marker visible at top while any figure is placeholder
