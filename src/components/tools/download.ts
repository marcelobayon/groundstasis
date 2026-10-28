// Client-side file download helper for the free templates (draw inspection
// form, draw request, draw schedule). Generates the file in the browser so no
// user-entered data ever leaves the device. No backend, no dependency.

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string = "text/plain;charset=utf-8"
): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    /* non-fatal: a blocked download should never throw into the UI */
  }
}
