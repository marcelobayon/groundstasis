# Phase 2 — Intelligence validation

Answers the question we can't answer by reading code: **does the classification
engine actually agree with reality, and how often is it wrong?** It runs the
exact production engine (`evaluateSite`) against sites whose real status you know
from an independent source, and reports precision, recall, false-positive and
false-negative rates, coverage, and confidence calibration.

## Why this exists
Unit tests prove the engine is internally consistent. They do **not** prove the
thresholds are right. Only labeled real-world sites can. This harness is the
bridge — and it is deliberately honest: when the engine abstains (`REVIEW`) or
lacks imagery (`DATA_GAP` → `INSUFFICIENT`), that is **not** scored as a wrong
answer; it lowers coverage instead. A model that abstains honestly must not look
like one that guesses wrong.

## 1. Provide real labels — do not invent them
Copy `labels.example.json` to `validation/labels.json` (gitignored) and fill it
with sites whose outcome you know from **independent evidence** — permit records,
GC-confirmed timelines, inspection reports. Every label requires a `source`
(provenance); `parseLabels` rejects unsourced labels. Example rows marked
`"__example__": true` are skipped.

```json
[
  { "siteId": "<Site.id>", "periodStart": "2026-01-01", "periodEnd": "2026-06-01",
    "groundTruth": "STALLED", "source": "permit #… + GC confirmation" }
]
```
`groundTruth` is `ACTIVE` (progressing) or `STALLED`.

## 2. Wire the observation loader (one adapter, runs where data lives)
`runValidation(labels, loadObservations, evaluate?)` takes an injected loader so
it stays testable and source-agnostic. In the deployed environment, point it at
your real observations. Two options:

- **From stored observations** (fast, no CDSE spend): reconstruct engine
  `Observation[]` from the `SiteObservation` + `SiteMetric` rows for the site
  within `[periodStart, periodEnd]`.
- **From a fresh CDSE pull** (same path the $9 check uses): call the Sentinel Hub
  provider for the site AOI over the period.

```ts
import { runValidation } from "@/lib/validation/harness";
import { parseLabels } from "@/lib/validation/labels";

const labels = parseLabels(JSON.parse(fs.readFileSync("validation/labels.json", "utf8")));
const run = await runValidation(labels, async (label) => loadEngineObservations(label));
console.log(JSON.stringify(run.report, null, 2));
```

## 3. Read the report
- `precision` / `recall` — of STALLED calls, how many were truly stalled; of truly
  stalled sites, how many we caught.
- `falsePositiveRate` — truly active sites we flagged as stalled (the costly error
  near a draw decision).
- `falseNegativeRate` — truly stalled sites we missed.
- `coverage` / `abstainRate` / `insufficientRate` — how often the engine committed
  vs. abstained vs. lacked data.
- `calibration` — empirical accuracy within each confidence band; `HIGH` should
  beat `MEDIUM` should beat `LOW`, or the confidence signal is miscalibrated.

## What's tested vs. what you wire
The metrics math and the harness orchestration are unit-tested
(`src/lib/validation/*.test.ts`). The only environment-specific piece is
`loadObservations` — the adapter to your observation source — which runs where
Prisma/CDSE are available.
