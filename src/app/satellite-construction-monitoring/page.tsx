import type { Metadata } from "next";
import { SeoCta } from "@/components/seo-cta";

export const metadata: Metadata = {
  title: "Satellite construction monitoring",
  description:
    "How satellite imagery (Copernicus Sentinel-2) is used to monitor construction sites over time — the data, the limits, and how to read a change signal honestly.",
  alternates: { canonical: "/satellite-construction-monitoring" },
};

export default function Page() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Guide</div>
        <h1 style={{ fontSize: 34, marginTop: 10 }}>Satellite construction monitoring, explained plainly</h1>
        <p className="lead" style={{ color: "#334155" }}>
          Earth-observation satellites photograph the same places repeatedly. By comparing a construction site across
          observations, you can measure how much its surface is changing over time — and notice when that change
          unexpectedly slows.
        </p>

        <h2>The data</h2>
        <p>
          Ground Stasis uses the European Copernicus programme&rsquo;s Sentinel-2 mission, which images most locations
          every few days at 10 m–20 m resolution and is free and public. That cadence and resolution are well suited to
          tracking whether a sizable site is actively changing — and poorly suited to counting individual beams or
          reading interior work.
        </p>

        <h2>Reading change honestly</h2>
        <p>
          Spectral indices such as NDVI, NDBI, and BSI summarise vegetation, built-up surfaces, and bare soil. They are
          indirect signals: useful for detecting that a surface moved, not for proving what specifically happened. A
          credible monitoring product uses them to flag change for review, not to assert construction milestones.
        </p>

        <h2>Clouds and gaps</h2>
        <p>
          The biggest honesty test in satellite monitoring is weather. Clouds, haze, and snow routinely make an
          observation unusable. The right response is to report a data gap — never to treat a missing image as evidence
          that work stopped.
        </p>

        <SeoCta />
      </div>
    </section>
  );
}
