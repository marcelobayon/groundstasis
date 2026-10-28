"use client";

import { useRef, useState } from "react";
import { downloadTextFile } from "./download";
import { trackToolStart, trackToolComplete, trackFileDownload, type ToolMeta } from "@/lib/analytics";

const META: ToolMeta = {
  tool_name: "utility_construction_inspection_form",
  tool_type: "template",
  content_tier: "tier_1",
};

const DOC_OPTIONS = [
  "811 / locate ticket",
  "As-built markup",
  "Compaction / density report",
  "Pressure / mandrel test log",
  "Material certifications",
  "Photos",
] as const;

type Fields = {
  projectName: string;
  segment: string;
  inspectionDate: string;
  inspector: string;
  permitLocate: string;
  utilityType: string;
  materialSize: string;
  contractor: string;
  trenchDepth: string;
  coverDepth: string;
  bedding: string;
  jointMethod: string;
  separation: string;
  testType: string;
  testResult: string;
  restoration: string;
  exceptions: string;
  reviewerNotes: string;
  signOffName: string;
  signOffDate: string;
};

const EMPTY: Fields = {
  projectName: "",
  segment: "",
  inspectionDate: "",
  inspector: "",
  permitLocate: "",
  utilityType: "",
  materialSize: "",
  contractor: "",
  trenchDepth: "",
  coverDepth: "",
  bedding: "",
  jointMethod: "",
  separation: "",
  testType: "",
  testResult: "",
  restoration: "",
  exceptions: "",
  reviewerNotes: "",
  signOffName: "",
  signOffDate: "",
};

function line(label: string, value: string): string {
  return `${label}: ${value.trim() ? value.trim() : "____________________"}`;
}

function buildTemplate(f: Fields, docs: Record<string, boolean>): string {
  const docLines = DOC_OPTIONS.map((d) => `  [${docs[d] ? "x" : " "}] ${d}`).join("\n");
  return `UTILITY CONSTRUCTION INSPECTION FORM
Ground Stasis — groundstasis.com

NOTE: The fields below are completed by the inspector, contractor, or utility
crew. They are inspector/contractor-recorded information — not satellite
observations. Ground Stasis keeps reported and observed clearly separate.

PROJECT
  ${line("Project name / address", f.projectName)}
  ${line("Segment / station / location", f.segment)}
  ${line("Inspection date", f.inspectionDate)}
  ${line("Inspector", f.inspector)}
  ${line("Permit # / 811 locate ticket", f.permitLocate)}

UTILITY
  ${line("Utility type (water / sewer / storm / gas / electric / telecom / conduit)", f.utilityType)}
  ${line("Material & size", f.materialSize)}
  ${line("Installing contractor", f.contractor)}

TRENCH & INSTALLATION (observed on site)
  ${line("Trench depth", f.trenchDepth)}
  ${line("Depth of cover", f.coverDepth)}
  ${line("Bedding material", f.bedding)}
  ${line("Joint / connection method", f.jointMethod)}
  ${line("Separation from other utilities", f.separation)}

TESTING & COMPACTION
  ${line("Test performed (pressure / mandrel / density)", f.testType)}
  ${line("Result (psi / pass-fail / % compaction)", f.testResult)}

SURFACE RESTORATION
  ${line("Restoration status", f.restoration)}

SUPPORTING DOCUMENTATION
${docLines}

EXCEPTIONS / PUNCH LIST / FOLLOW-UP ITEMS
  ${f.exceptions.trim() ? f.exceptions.trim() : "____________________"}

INSPECTOR NOTES
  ${f.reviewerNotes.trim() ? f.reviewerNotes.trim() : "____________________"}

SIGN-OFF
  ${line("Reviewed by", f.signOffName)}
  ${line("Date", f.signOffDate)}
`;
}

export function UtilityInspectionForm() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const startedRef = useRef(false);

  function touch() {
    if (!startedRef.current) {
      startedRef.current = true;
      trackToolStart(META);
    }
  }

  function set<K extends keyof Fields>(key: K) {
    return (e: { target: { value: string } }) => {
      touch();
      setF((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  function toggleDoc(d: string) {
    touch();
    setDocs((prev) => ({ ...prev, [d]: !prev[d] }));
  }

  function download() {
    downloadTextFile("utility-construction-inspection-form.txt", buildTemplate(f, docs));
    trackFileDownload("utility-construction-inspection-form.txt", "tier_1");
    trackToolComplete(META);
  }

  function print() {
    trackToolComplete(META, "print");
    if (typeof window !== "undefined") window.print();
  }

  const field: React.CSSProperties = { marginBottom: 14 };

  return (
    <div className="card">
      <div className="callout" style={{ marginBottom: 16 }}>
        Fill it in below and download a clean copy, or download it blank to print and complete on site. Nothing you type
        leaves your device — the file is generated in your browser.
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="field" style={field}>
          <label htmlFor="ui-project">Project name / address</label>
          <input id="ui-project" value={f.projectName} onChange={set("projectName")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-segment">Segment / station / location</label>
          <input id="ui-segment" value={f.segment} onChange={set("segment")} placeholder="e.g. STA 12+00–15+50" />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-date">Inspection date</label>
          <input id="ui-date" type="date" value={f.inspectionDate} onChange={set("inspectionDate")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-inspector">Inspector</label>
          <input id="ui-inspector" value={f.inspector} onChange={set("inspector")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-permit">Permit # / 811 locate ticket</label>
          <input id="ui-permit" value={f.permitLocate} onChange={set("permitLocate")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-utype">Utility type</label>
          <input id="ui-utype" value={f.utilityType} onChange={set("utilityType")} placeholder="water / sewer / storm / gas / electric / telecom / conduit" />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-material">Material &amp; size</label>
          <input id="ui-material" value={f.materialSize} onChange={set("materialSize")} placeholder='e.g. 8" PVC SDR-35' />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-contractor">Installing contractor</label>
          <input id="ui-contractor" value={f.contractor} onChange={set("contractor")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-trench">Trench depth</label>
          <input id="ui-trench" value={f.trenchDepth} onChange={set("trenchDepth")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-cover">Depth of cover</label>
          <input id="ui-cover" value={f.coverDepth} onChange={set("coverDepth")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-bedding">Bedding material</label>
          <input id="ui-bedding" value={f.bedding} onChange={set("bedding")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-joint">Joint / connection method</label>
          <input id="ui-joint" value={f.jointMethod} onChange={set("jointMethod")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-sep">Separation from other utilities</label>
          <input id="ui-sep" value={f.separation} onChange={set("separation")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-testtype">Test performed</label>
          <input id="ui-testtype" value={f.testType} onChange={set("testType")} placeholder="pressure / mandrel / density" />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-testresult">Test result</label>
          <input id="ui-testresult" value={f.testResult} onChange={set("testResult")} placeholder="psi / pass-fail / % compaction" />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-restore">Surface restoration status</label>
          <input id="ui-restore" value={f.restoration} onChange={set("restoration")} />
        </div>
      </div>

      <div className="field" style={field}>
        <label>Supporting documentation reviewed</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 6 }}>
          {DOC_OPTIONS.map((d) => (
            <label key={d} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
              <input type="checkbox" checked={!!docs[d]} onChange={() => toggleDoc(d)} />
              {d}
            </label>
          ))}
        </div>
      </div>

      <div className="field" style={field}>
        <label htmlFor="ui-exceptions">Exceptions / punch list / follow-up</label>
        <textarea id="ui-exceptions" rows={3} value={f.exceptions} onChange={set("exceptions")} />
      </div>
      <div className="field" style={field}>
        <label htmlFor="ui-notes">Inspector notes</label>
        <textarea id="ui-notes" rows={2} value={f.reviewerNotes} onChange={set("reviewerNotes")} />
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="field" style={field}>
          <label htmlFor="ui-signname">Reviewed by</label>
          <input id="ui-signname" value={f.signOffName} onChange={set("signOffName")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="ui-signdate">Sign-off date</label>
          <input id="ui-signdate" type="date" value={f.signOffDate} onChange={set("signOffDate")} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={download}>
          Download form (.txt)
        </button>
        <button type="button" className="btn btn-secondary" onClick={print}>
          Print / save as PDF
        </button>
      </div>
    </div>
  );
}
