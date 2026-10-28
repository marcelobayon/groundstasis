# Algorithm

The stasis algorithm is a **transparent, deterministic heuristic** — not machine learning. Every
number is explainable and every threshold lives in one config object
([`src/lib/analysis/config.ts`](./src/lib/analysis/config.ts)).

> The thresholds below are **product defaults (initial heuristics), not scientific facts.** They are
> expected to be calibrated against real labelled sites over time.

## Inputs

For each site we have a chronological list of `Observation`s — each one a set of site-level statistics
(mean/median NDVI, NDBI, BSI over valid pixels, plus `validPixelPercent`, `cloudPercent`, and a
quality flag). See [`SATELLITE_DATA.md`](./SATELLITE_DATA.md) for where those come from.

## Step 1 — usability filter

An observation is **usable** when `qualityStatus === "OK"`, `validPixelPercent ≥ 60`, and
`cloudPercent ≤ 40`. Unusable observations are excluded from all temporal reasoning.

## Step 2 — site-level change

Between two consecutive usable observations:

```
siteChangePercent = ((|ΔNDVI| + |ΔNDBI| + |ΔBSI|) / 3) × 100
changeVelocity    = siteChangePercent / daysBetween
```

A direction-agnostic magnitude: _how much did the surface move between these two looks._ It is a
heuristic, not a measurement of construction.

## Step 3 — site baseline

```
baseline.median = median( historical change intervals, excluding the most recent `recentWindow` )
baseline.established = (#historical intervals ≥ minBaselineIntervals)
```

We exclude the recent window so the period under test does not define "normal", and use the median to
resist a single dramatic clearing event.

## Step 4 — stasis score (0–100)

```
recentChange     = mean( last `recentWindow` change intervals )
lowThreshold     = baseline.median × lowChangeFractionOfBaseline
consecutiveLow   = count of trailing intervals with siteChangePercent < lowThreshold
lowChangeDuration= sum of their days

deficit          = clamp(1 − recentChange / baseline.median, 0, 1)
z                = (baseline.median − recentChange) / baseline.stDev

recentLowChange    = deficit                               × 40
historicalDeviation= clamp(z / historicalDeviationFullZ,0,1)× 20
duration           = clamp(lowChangeDuration / minDaysForStrongStasis,0,1) × 20
consecutive        = clamp(consecutiveLow / consecutiveLowChangeRequired,0,1) × 20
dataQualityPenalty = (1 − dataQuality)                     × 20

score = round( clamp( recentLowChange + historicalDeviation + duration + consecutive
                      − dataQualityPenalty, 0, 100 ) )
```

The score **requires several conditions to align** — low recent change _and_ persistence _and_
consecutive low-change observations _and_ good data quality — rather than firing on low change alone.
This is the core false-positive protection.

## Step 5 — confidence (separate from the score)

Confidence (HIGH / MEDIUM / LOW) is computed from evidence volume, observation cleanliness, and
whether a baseline is established. It is deliberately independent of the score so that **a strong
score on weak evidence cannot trigger the strongest alert.**

## Step 6 — status

```
score ≤ 24  → ACTIVE
   ≤ 49      → WATCH
   ≤ 74      → REVIEW
   > 74      → STASIS
```

Then two protective overrides:

1. A `STASIS` score with **LOW confidence** is capped to **REVIEW** (`lowConfidenceStatusCap`).
2. A `STASIS` score whose low-change span is shorter than `minDaysForStasisCandidate` is downgraded
   to **REVIEW**.

And the hard rule, everywhere: **insufficient or stale data → DATA GAP, never STASIS.** There is no
automated `ABANDONED` or `FRAUD` status. The engine makes no legal or underwriting conclusions.

## Default thresholds (`STASIS_CONFIG`)

| Key | Default | Meaning |
| --- | --- | --- |
| `minValidObservations` | 3 | min usable obs before any determination |
| `minBaselineIntervals` | 2 | min intervals for an established baseline |
| `minDaysForStasisCandidate` | 10 | min low-change span to be a candidate |
| `minDaysForStrongStasis` | 15 | span earning full duration credit |
| `recentWindow` | 2 | intervals used for "recent change" |
| `lowChangeFractionOfBaseline` | 0.4 | "low" = below 40% of baseline |
| `consecutiveLowChangeRequired` | 3 | consecutive lows for full credit |
| `weights` | 40/20/20/20/−20 | score component weights |
| `statusBands` | 24/49/74 | ACTIVE/WATCH/REVIEW upper bounds |
| `minUsablePixelPercent` | 60 | below → LOW_QUALITY |
| `maxCloudPercent` | 40 | above → LOW_QUALITY |
| `maxDaysSinceUsableObservation` | 21 | older latest obs → DATA GAP |

## Calibration & versioning

Change the config, bump `THRESHOLDS_VERSION`, and keep historical results under their original
version. Because evaluations are pure and record every input, any stored analysis can be recomputed
deterministically under a new version for comparison. A future ML model, if ever justified, slots in
as an additional scorer behind the same `SiteEvaluation` output — it does not replace the auditable
heuristic.
