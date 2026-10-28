import type { SatelliteProvider } from "./provider";
import { DemoProvider } from "./demo-provider";
import { SentinelHubProvider } from "./sentinelhub-provider";
import { STASIS_CONFIG } from "@/lib/analysis/config";

export * from "./types";
export * from "./provider";
export { DemoProvider } from "./demo-provider";
export { SentinelHubProvider } from "./sentinelhub-provider";

/**
 * Select the satellite provider from the environment.
 *
 * Defaults to the DemoProvider so the app runs with zero configuration. Set
 * SATELLITE_PROVIDER=sentinelhub (plus CDSE credentials) to go live. If the
 * live provider is requested but not configured, we fall back to demo and log a
 * warning rather than crashing — the app stays up.
 */
export function getSatelliteProvider(env: NodeJS.ProcessEnv = process.env): SatelliteProvider {
  const choice = (env.SATELLITE_PROVIDER ?? "demo").toLowerCase();

  if (choice === "sentinelhub" || choice === "cdse") {
    const provider = new SentinelHubProvider({
      clientId: env.SENTINELHUB_CLIENT_ID ?? "",
      clientSecret: env.SENTINELHUB_CLIENT_SECRET ?? "",
      baseUrl: env.SENTINELHUB_BASE_URL ?? "https://sh.dataspace.copernicus.eu",
      tokenUrl:
        env.SENTINELHUB_TOKEN_URL ??
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
      minUsablePixelPercent: STASIS_CONFIG.minUsablePixelPercent,
      aggregationInterval: env.SENTINELHUB_AGGREGATION_INTERVAL ?? "P12D",
    });
    if (provider.isConfigured()) return provider;
    // eslint-disable-next-line no-console
    console.warn(
      "[ground-stasis] SATELLITE_PROVIDER=sentinelhub but credentials are missing; falling back to DEMO provider."
    );
  }

  return new DemoProvider();
}
