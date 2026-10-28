# Testing

```bash
npm run test        # run everything once (Vitest)
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit across app + tests
npm run lint        # next lint
```

The suite is **56 tests across 12 files** and runs in a few seconds with no network, no database, and
no API keys — because the analysis engine is pure.

## Coverage map

| File | What it proves |
| --- | --- |
| `analysis/indices.test.ts` | NDVI/NDBI/BSI math; divide-by-zero → null; masked/undefined pixels excluded; site stats from a synthetic raster scene; valid-pixel %. |
| `analysis/change.test.ts` | `siteChangePercent` (direction-agnostic); deltas; `daysBetween` never negative; ordered change series. |
| `analysis/baseline.test.ts` | Baseline excludes the recent window; median; `established` flag. |
| `analysis/stasis.test.ts` | High score when recent collapses below baseline; low score when active; data-quality penalty lowers the score; 0–100 clamp. |
| `analysis/confidence.test.ts` | HIGH with many clean obs + baseline; LOW with few/obscured obs + no baseline. |
| `analysis/status.test.ts` | Score→status bands; usability filter; **DATA GAP** on too-few / stale / empty — never STASIS. |
| `analysis/alerts.test.ts` | STASIS_DETECTED on transition; **idempotency**; ACTIVITY_RESUMED; DATA_GAP; no alert when unchanged; OBSERVATION_AVAILABLE. |
| `analysis/temporal.test.ts` | Full ladder ACTIVE → WATCH → … → STASIS → (resume) ACTIVE over the demo timeline, with HIGH confidence at stasis and an ACTIVITY_RESUMED alert. |
| `geo/geo.test.ts` | Polygon area (~1 km² check) + acres; GeoJSON validation (rejects unclosed / non-polygon / out-of-range); suitability GOOD/LIMITED/INSUFFICIENT. |
| `auth/magic-link.test.ts` | Sign/verify; expiry; tamper rejection; **secret rotation**. |
| `billing/stripe.test.ts` | Webhook signature: valid; wrong secret; tampered payload; timestamp tolerance; malformed header. |
| `jobs/analyze-site.test.ts` | End-to-end demo cycle reaches STASIS and "sends" an alert; **a provider failure degrades to DATA GAP and never emits a stasis alert**. |

## Fixtures

`src/test/fixtures.ts` provides `makeObservation`, `makeChange`, `bandStats`, and `squarePolygon`
(a metre-accurate square for area/suitability tests). The demo timeline in `src/data/demo-site.ts`
doubles as a realistic temporal fixture — it is run through the **real** engine, never faked.

## What a good calibration test looks like later

When real labelled sites exist, add fixtures of their observation series and assert the status the
engine assigns, bumping `THRESHOLDS_VERSION` when weights change. Because evaluations are pure and
record all inputs, regression tests are just stored input → expected status pairs.
