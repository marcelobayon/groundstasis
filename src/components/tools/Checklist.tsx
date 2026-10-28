"use client";

import * as React from "react";
import { useEffect, useState } from "react";

// An interactive, checkable list. Progress persists per-browser via
// localStorage (a per-viewer convenience — wrapped in try/catch, safe if
// storage is blocked). "Print / Save as PDF" turns it into a lead-magnet PDF.

export interface ChecklistSection {
  title: string;
  items: string[];
}

export function Checklist({ storageKey, sections }: { storageKey: string; sections: ChecklistSection[] }) {
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* storage blocked — render unchecked */
    }
    setLoaded(true);
  }, [storageKey]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = checked.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="tl-bar" style={{ height: 12 }}>
            <span style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--navy)" }} />
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {loaded ? `${done} of ${total} complete` : `${total} items`}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {sections.map((section, si) => (
        <div className="card" key={section.title} style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 10 }}>{section.title}</h3>
          <div>
            {section.items.map((item, ii) => {
              const key = `${si}:${ii}`;
              const isOn = checked.has(key);
              return (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "8px 0",
                    borderTop: ii === 0 ? "none" : "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(key)}
                    style={{ marginTop: 4, width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 15, color: isOn ? "var(--slate)" : "var(--text)", textDecoration: isOn ? "line-through" : "none" }}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
