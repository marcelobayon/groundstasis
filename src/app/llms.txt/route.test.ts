import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { openApiSpec } from "@/lib/api/openapi";

describe("/llms.txt", () => {
  it("serves a plain-text product summary that points agents at the spec", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("# Ground Stasis");
    expect(body).toContain("/api/v1/openapi.json");
    expect(body).toContain("$9"); // real, live pricing is stated
    expect(body).toContain("DATA_GAP"); // the honesty-critical distinction is present
  });
});

describe("openApiSpec agent-understanding content", () => {
  it("explains the STASIS vs DATA_GAP distinction and the no-verification limits", () => {
    const text = JSON.stringify(openApiSpec);
    expect(text).toContain("never reported as");
    expect(text).toContain("DATA_GAP");
    expect(text).toContain("not proof");
    expect(text.toLowerCase()).toContain("does not");
  });

  it("documents machine-readable error codes", () => {
    const text = JSON.stringify(openApiSpec);
    expect(text).toContain("rate_limited");
    expect(text).toContain("forbidden");
  });
});
