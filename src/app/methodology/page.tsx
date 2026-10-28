import type { Metadata } from "next";
import * as React from "react";
import { STASIS_CONFIG, ANALYSIS_VERSION, THRESHOLDS_VERSION } from "@/lib/analysis/config";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Ground Stasis turns Copernicus Sentinel-2 observations into a construction-stasis signal — and where established satellite facts end and Ground Stasis heuristics begin.",
  alternates: { canonical: "/methodology" },
};

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <div className="fact">
      <span className="tag data">Established data fact</span>
      <div>{children}</div>
    </div>
  );
}
function Heuristic({ children }: { children: React.ReactNode }) {
  return (
    <div className="heuristic">
      <span className="tag heur">Ground Stasis heuristic</span>
      <div>{children}</div>
    </div>
  );
}

export default function MethodologyPage() {
  const w = STASIS_CONFIG.weights;
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Methodology</div>
        <h1 style={{ fontSize: 36, marginTop: 10 }}>How Ground Stasis works</h1>
        <p className="lead" style={{ color: "#334155" }}>
          Ground Stasis turns satellite observations into a simple risk signal. This page explains the pipeline and is
          deliberately explicit about the line between what is an established property of the satellite data and what is
          a Ground Stasis heuristic that we expect to calibrate over time.
        </p>

        <h2>Data source</h2>
        <Fact>
          Copernicus <strong>Sentinel-2</strong> provides multispectral imagery at 10 m and 20 m spatial resolutions.
          Ground Stasis uses <strong>Level-2A</strong> surface-reflectance products. The bands used are B02 (blue, 10 m),
          B04 (red, 10 m), B08 (near-infrared, 10 m), and B11 (shortwave-infrared, 20 m).
        </Fact>
        <Fact>
          B02, B04, and B08 are native 10 m. <strong>B11 is native 20 m</strong>; when combined with 10 m bands it is
          resampled to a common 10 m working grid. B11 is <em>not</em> native 10 m.
        </Fact>
        <Fact>
          Sentinel-2 revisits most locations every few days, but a usable, cloud-free observation is{" "}
          <strong>not guaranteed</strong> on any given pass. Clouds, haze, shadow, snow, and acquisition conditions
          create gaps.
        </Fact>
        <Heuristic>
          Because usable observations are irregular, Ground Stasis reasons over <em>usable observations</em>, not
          calendar time, and reports a <strong>DATA GAP</strong> rather than guessing when clean imagery is unavailable.
        </Heuristic>

        <h2>Spectral indices</h2>
        <p>
          For each usable observation, we compute three normalized indices over the site polygon. These are standard,
          published index definitions:
        </p>
        <div className="eq">NDVI = (B08 − B04) / (B08 + B04)</div>
        <div className="eq">NDBI = (B11 − B08) / (B11 + B08)</div>
        <div className="eq">BSI = ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02))</div>
        <Fact>
          NDVI responds to vegetation, NDBI to built-up/impervious surfaces, and BSI to bare soil. Division is guarded
          against zero denominators; undefined or masked pixels are excluded.
        </Fact>
        <Heuristic>
          These indices are <strong>indirect signals</strong>. Ground Stasis does not claim that a given NDBI value
          &ldquo;means concrete&rdquo; or that an NDVI threshold &ldquo;means a foundation.&rdquo; They are used only as
          complementary inputs to a temporal change measure.
        </Heuristic>

        <h2>Cloud &amp; quality filtering</h2>
        <Fact>
          Sentinel-2 L2A ships a Scene Classification Layer (SCL). Ground Stasis excludes pixels classified as cloud
          (medium/high probability), cirrus, cloud shadow, and snow, and uses the scene&rsquo;s data mask to drop
          no-data pixels.
        </Fact>
        <Heuristic>
          We compute a <code>usable_pixel_percentage</code> for each observation. Below{" "}
          {STASIS_CONFIG.minUsablePixelPercent}% usable pixels (or above {STASIS_CONFIG.maxCloudPercent}% contamination)
          the observation is marked <strong>LOW&nbsp;QUALITY</strong> and excluded from strong temporal conclusions.
          These thresholds are configurable.
        </Heuristic>

        <h2>Site-level change</h2>
        <p>
          We reduce each observation to the mean of each index over the valid pixels, then measure change between two
          consecutive usable observations:
        </p>
        <div className="eq">siteChangePercent = ((|ΔNDVI| + |ΔNDBI| + |ΔBSI|) / 3) × 100</div>
        <Heuristic>
          This direction-agnostic magnitude is a Ground Stasis construction. It answers &ldquo;how much did the surface
          move between these two looks&rdquo; — it is not a physical measurement of construction progress.
        </Heuristic>

        <h2>Baseline</h2>
        <Heuristic>
          Ground Stasis builds a <strong>site-specific baseline</strong> from the median of the site&rsquo;s historical
          change intervals (excluding the most recent window, so the period under test does not define &ldquo;normal&rdquo;).
          A baseline is considered established after at least {STASIS_CONFIG.minBaselineIntervals} usable change
          intervals.
        </Heuristic>

        <h2>Stasis score</h2>
        <p>The 0–100 score is a transparent weighted sum, then clamped:</p>
        <div className="eq">
          score = recentLowChange({w.recentLowChange}) + historicalDeviation({w.historicalDeviation}) + duration(
          {w.duration}) + consecutive({w.consecutive}) − dataQualityPenalty({w.dataQualityPenalty})
        </div>
        <Heuristic>
          The score is <strong>not a probability of abandonment</strong>. It represents how strongly recent usable
          observations resemble an unusually inactive period relative to this site&rsquo;s own baseline. It deliberately
          requires several conditions to align — low recent change <em>and</em> persistence <em>and</em> consecutive
          low-change observations <em>and</em> good data quality — rather than firing on low change alone.
        </Heuristic>

        <h2>Confidence</h2>
        <Heuristic>
          Separately from the score, Ground Stasis rates confidence HIGH / MEDIUM / LOW from the number of usable
          observations, their cleanliness, and whether a baseline is established. A stasis-range score with only LOW
          confidence is capped to <strong>Review</strong> and never triggers the strongest alert.
        </Heuristic>

        <h2>Status bands</h2>
        <Heuristic>
          Default mapping (configurable): 0–{STASIS_CONFIG.statusBands.active} Active, {STASIS_CONFIG.statusBands.active + 1}
          –{STASIS_CONFIG.statusBands.watch} Watch, {STASIS_CONFIG.statusBands.watch + 1}–
          {STASIS_CONFIG.statusBands.review} Review, {STASIS_CONFIG.statusBands.review + 1}–100 Stasis. A lack of usable
          data is always <strong>Data gap</strong>, never Stasis. There is no automated &ldquo;Abandoned&rdquo; or
          &ldquo;Fraud&rdquo; status.
        </Heuristic>

        <h2>Limitations</h2>
        <ul>
          <li>Sentinel-2 observations are not continuous; clouds can prevent usable observations for weeks.</li>
          <li>Satellite imagery cannot see every construction activity, especially interior or vertical work.</li>
          <li>10 m-class imagery is appropriate only for sufficiently large sites.</li>
          <li>Spectral indices are indirect signals, not measurements of construction stages.</li>
          <li>A stasis signal is an analytical flag for review, not proof of abandonment or any legal conclusion.</li>
          <li>Results should be reviewed alongside lender records, borrower reporting, and other evidence.</li>
        </ul>

        <h2>Auditability &amp; versioning</h2>
        <Heuristic>
          Every evaluation stores the observation ids used, the algorithm version (<code>{ANALYSIS_VERSION}</code>), the
          thresholds version (<code>{THRESHOLDS_VERSION}</code>), the provider, the metrics, the confidence, and the
          resulting status. Historical scores are never silently changed; recalculation under a new version is explicit.
        </Heuristic>

        <p className="small muted" style={{ marginTop: 28 }}>
          Ground Stasis is an independent monitoring signal and does not replace physical inspection, appraisal,
          engineering review, or underwriting judgment.
        </p>
      </div>
    </section>
  );
}
