# Methodology

This mirrors the public [`/methodology`](./src/app/methodology/page.tsx) page and is the reference for
the line between **established data facts** and **Ground Stasis heuristics**. Keeping that line
explicit is a core credibility feature of the product.

## Established data facts

- Copernicus Sentinel-2 provides multispectral imagery at **10 m and 20 m** resolutions. Ground
  Stasis uses **Level-2A** surface reflectance.
- Bands: B02 (blue, 10 m), B04 (red, 10 m), B08 (NIR, 10 m), B11 (SWIR, **20 m**, resampled to 10 m).
- Index definitions are standard:
  - `NDVI = (B08 − B04) / (B08 + B04)`
  - `NDBI = (B11 − B08) / (B11 + B08)`
  - `BSI  = ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02))`
- Sentinel-2 L2A includes a Scene Classification Layer (SCL) usable to exclude cloud, cirrus, cloud
  shadow, and snow.
- Sentinel-2 revisits frequently but usable cloud-free observations are not guaranteed.

## Ground Stasis heuristics (not scientific facts)

- Reasoning over **usable observations**, not calendar time; reporting **DATA GAP** when clean imagery
  is unavailable rather than guessing.
- The combined `siteChangePercent = ((|ΔNDVI| + |ΔNDBI| + |ΔBSI|)/3) × 100` magnitude.
- A **site-specific baseline** = median of historical change intervals (excluding the recent window).
- The weighted **stasis score** and its component weights.
- The **confidence** model and the rule that LOW confidence caps a stasis-range score to Review.
- The **status bands** and all thresholds in `STASIS_CONFIG`.

## What the indices are — and are not

NDVI/NDBI/BSI respond to vegetation, built-up surfaces, and bare soil respectively. They are
**indirect signals** used as complementary inputs. Ground Stasis does **not** assert things like
"positive NDBI means concrete" or "NDVI below 0.20 means a foundation", and it does not claim that
N days of low variance "proves" abandonment. The system is deliberately conservative: "these signals
may be consistent with…", "the system detected…".

## Limitations (always disclosed)

- Observations are not continuous; clouds can block usable imagery for weeks.
- Satellite imagery cannot see every construction activity (especially interior/vertical work).
- 10 m-class imagery suits only sufficiently large sites.
- Spectral indices are indirect signals, not measurements of construction stages.
- A stasis signal is an analytical flag for review, **not** proof of abandonment or any legal
  conclusion, and **not** a replacement for inspection, appraisal, engineering review, or
  underwriting judgment.
- Results should be reviewed alongside lender records, borrower reporting, and other evidence.

See [`ALGORITHM.md`](./ALGORITHM.md) for the exact math and [`SATELLITE_DATA.md`](./SATELLITE_DATA.md)
for the data pipeline.
