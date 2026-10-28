"use client";

import { useRef, useState } from "react";
import { downloadTextFile } from "./download";
import { trackToolStart, trackToolComplete, trackFileDownload, type ToolMeta } from "@/lib/analytics";

const META: ToolMeta = {
  tool_name: "construction_draw_inspection_form",
  tool_type: "template",
  content_tier: "tier_1",
};

const DOC_OPTIONS = ["Progress photos", "Lien waivers", "Updated schedule", "Invoices / pay applications"] as const;

type Fields = {
  projectName: string;
  loanNumber: string;
  inspectionDate: string;
  inspector: string;
  reportedStage: string;
  reportedPct: string;
  drawNumber: string;
  amountRequested: string;
  workReviewed: string;
  photoCount: string;
  exceptions: string;
  additionalVerification: string;
  reviewerNotes: string;
  signOffName: string;
  signOffDate: string;
};

const EMPTY: Fields = {
  projectName: "",
  loanNumber: "",
  inspectionDate: "",
  inspector: "",
  reportedStage: "",
  reportedPct: "",
  drawNumber: "",
  amountRequested: "",
  workReviewed: "",
  photoCount: "",
  exceptions: "",
  additionalVerification: "",
  reviewerNotes: "",
  signOffName: "",
  signOffDate: "",
};

function line(label: string, value: string): string {
  return `${label}: ${value.trim() ? value.trim() : "____________________"}`;
}

function buildTemplate(f: Fields, docs: Record<string, boolean>): string {
  const docLines = DOC_OPTIONS.map((d) => `  [${docs[d] ? "x" : " "}] ${d}`).join("\n");
  return `CONSTRUCTION DRAW INSPECTION FORM
Ground Stasis — groundstasis.com

NOTE: The reported and observed fields below are completed by the inspector,
borrower, or contractor. They are inspector/lender-recorded information — not
satellite observations.

PROJECT
  ${line("Project name / address", f.projectName)}
  ${line("Loan number", f.loanNumber)}
  ${line("Inspection date", f.inspectionDate)}
  ${line("Inspector", f.inspector)}

REPORTED STATUS (as reported by borrower / contractor)
  ${line("Reported construction stage", f.reportedStage)}
  ${line("Reported % complete", f.reportedPct)}
  ${line("Draw number", f.drawNumber)}
  ${line("Amount requested", f.amountRequested)}

WORK REVIEWED ON SITE (observed by inspector)
  ${f.workReviewed.trim() ? f.workReviewed.trim() : "____________________"}

SUPPORTING DOCUMENTATION
${docLines}
  ${line("Photos attached (count)", f.photoCount)}

EXCEPTIONS / INCOMPLETE WORK / FOLLOW-UP ITEMS
  ${f.exceptions.trim() ? f.exceptions.trim() : "____________________"}

RECOMMENDED ADDITIONAL VERIFICATION
  ${f.additionalVerification.trim() ? f.additionalVerification.trim() : "____________________"}

REVIEWER NOTES
  ${f.reviewerNotes.trim() ? f.reviewerNotes.trim() : "____________________"}

SIGN-OFF
  ${line("Reviewed by", f.signOffName)}
  ${line("Date", f.signOffDate)}
`;
}

export function DrawInspectionForm() {
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
    downloadTextFile("construction-draw-inspection-form.txt", buildTemplate(f, docs));
    trackFileDownload("construction-draw-inspection-form.txt", "tier_1");
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
          <label htmlFor="di-project">Project name / address</label>
          <input id="di-project" value={f.projectName} onChange={set("projectName")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-loan">Loan number</label>
          <input id="di-loan" value={f.loanNumber} onChange={set("loanNumber")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-date">Inspection date</label>
          <input id="di-date" type="date" value={f.inspectionDate} onChange={set("inspectionDate")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-inspector">Inspector</label>
          <input id="di-inspector" value={f.inspector} onChange={set("inspector")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-stage">Reported construction stage</label>
          <input id="di-stage" value={f.reportedStage} onChange={set("reportedStage")} placeholder="e.g. Foundation, Framing" />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-pct">Reported % complete</label>
          <input id="di-pct" inputMode="decimal" value={f.reportedPct} onChange={set("reportedPct")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-draw">Draw number</label>
          <input id="di-draw" value={f.drawNumber} onChange={set("drawNumber")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-amount">Amount requested</label>
          <input id="di-amount" value={f.amountRequested} onChange={set("amountRequested")} />
        </div>
      </div>

      <div className="field" style={field}>
        <label htmlFor="di-work">Work reviewed on site</label>
        <textarea id="di-work" rows={3} value={f.workReviewed} onChange={set("workReviewed")} />
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

      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="field" style={field}>
          <label htmlFor="di-photos">Photos attached (count)</label>
          <input id="di-photos" inputMode="numeric" value={f.photoCount} onChange={set("photoCount")} />
        </div>
      </div>

      <div className="field" style={field}>
        <label htmlFor="di-exceptions">Exceptions / incomplete work / follow-up</label>
        <textarea id="di-exceptions" rows={3} value={f.exceptions} onChange={set("exceptions")} />
      </div>
      <div className="field" style={field}>
        <label htmlFor="di-verify">Recommended additional verification</label>
        <textarea id="di-verify" rows={2} value={f.additionalVerification} onChange={set("additionalVerification")} />
      </div>
      <div className="field" style={field}>
        <label htmlFor="di-notes">Reviewer notes</label>
        <textarea id="di-notes" rows={2} value={f.reviewerNotes} onChange={set("reviewerNotes")} />
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <div className="field" style={field}>
          <label htmlFor="di-signname">Reviewed by</label>
          <input id="di-signname" value={f.signOffName} onChange={set("signOffName")} />
        </div>
        <div className="field" style={field}>
          <label htmlFor="di-signdate">Sign-off date</label>
          <input id="di-signdate" type="date" value={f.signOffDate} onChange={set("signOffDate")} />
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
