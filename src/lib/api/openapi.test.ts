import { describe, it, expect } from "vitest";
import { openApiSpec } from "./openapi";

// Guards that the published spec actually lists every live endpoint and keeps
// the bearer security scheme — cheap protection against the hand-maintained
// spec drifting from the routes.
describe("openApiSpec", () => {
  it("declares bearer auth as the security scheme", () => {
    expect(openApiSpec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(openApiSpec.security).toEqual([{ bearerAuth: [] }]);
  });

  it("documents every v1 endpoint", () => {
    const paths = Object.keys(openApiSpec.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/sites",
        "/sites/{id}",
        "/sites/{id}/observations",
        "/checks/{id}",
        "/usage",
      ]),
    );
  });

  it("targets the v1 base URL", () => {
    expect(openApiSpec.servers[0].url).toBe("https://groundstasis.com/api/v1");
  });
});
