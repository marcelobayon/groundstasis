import type { Metadata } from "next";
import Link from "next/link";
import { ActivityCheck } from "@/components/tools/ActivityCheck";

export const metadata: Metadata = {
  title: "Free Construction Activity Check",
  description:
    "Free check: see your monitoring exposure on a construction site — how long it's been since anyone confirmed it's physically moving — and what a satellite check would show.",
  alternates: { canonical: "/construction-activity-check" },
};

export default function Page() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Free check</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px" }}>Is your project still moving?</h1>
        <p className="lead" style={{ color: "#334155", marginBottom: 16 }}>
          Enter one site. This free check shows your monitoring exposure — how long you&rsquo;ve had no independent
          confirmation it&rsquo;s physically moving. To see what the satellite actually observed on that site, run a
          Ground Stasis check.
        </p>

        <ActivityCheck />

        <p className="small muted" style={{ marginTop: 20 }}>
          New here? Start with the free{" "}
          <Link href="/construction-loan-monitoring-checklist">monitoring checklist</Link> or the{" "}
          <Link href="/construction-monitoring-gap-calculator">gap calculator</Link>. Ground Stasis is an independent
          monitoring signal — it doesn&rsquo;t replace inspections, and it never claims a project has stopped.
        </p>
      </div>
    </section>
  );
}
