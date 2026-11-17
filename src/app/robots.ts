import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Allow the public, machine-readable API spec (and llms.txt is at root).
        // Longest-match wins, so this specific allow overrides the /api/ disallow
        // for the spec only — private API data stays disallowed.
        allow: ["/", "/api/v1/openapi.json"],
        // Keep app surfaces and anything that could carry private site data out
        // of the index (spec §41).
        disallow: ["/demo", "/admin", "/setup", "/s/", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
