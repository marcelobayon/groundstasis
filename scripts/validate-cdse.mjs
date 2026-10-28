#!/usr/bin/env node
// =============================================================================
// validate-cdse.mjs — confirm the Statistical API response shape the
// SentinelHubProvider parser assumes.
//
// WHY: the provider's response parsing (outputs.indices.bands.B0/B1/B2.stats,
// the "50.0" percentile key, the dataMask sampleCount) was written from the
// CDSE docs but never run against a live response. This script verifies it.
//
// USAGE:
//   node scripts/validate-cdse.mjs --self-test     # offline, uses a baked response
//   SENTINELHUB_CLIENT_ID=... SENTINELHUB_CLIENT_SECRET=... \
//     node scripts/validate-cdse.mjs               # live: one real request
//
// PRIVACY: prints only the response SHAPE (keys, counts, a couple of numbers).
// It never prints your client secret or token. Safe to paste the output back.
// =============================================================================

const BASE = process.env.SENTINELHUB_BASE_URL ?? "https://sh.dataspace.copernicus.eu";
const TOKEN_URL =
  process.env.SENTINELHUB_TOKEN_URL ??
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const INTERVAL = process.env.SENTINELHUB_AGGREGATION_INTERVAL ?? "P12D";

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02","B04","B08","B11","SCL","dataMask"] }],
    output: [{ id: "indices", bands: 3, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]
  };
}
function evaluatePixel(s) {
  let ndvi = index(s.B08, s.B04);
  let ndbi = index(s.B11, s.B08);
  let den = (s.B11 + s.B04) + (s.B08 + s.B02);
  let bsi = den === 0 ? 0 : ((s.B11 + s.B04) - (s.B08 + s.B02)) / den;
  var bad = (s.SCL==3 || s.SCL==8 || s.SCL==9 || s.SCL==10 || s.SCL==11);
  var valid = (s.dataMask==1 && !bad) ? 1 : 0;
  return { indices: [ndvi, ndbi, bsi], dataMask: [valid] };
}`;

// A ~250 m AOI near Salt Lake City and a recent window (edit freely).
const SAMPLE_GEOMETRY = {
  type: "Polygon",
  coordinates: [[[-111.95, 40.76], [-111.947, 40.76], [-111.947, 40.762], [-111.95, 40.762], [-111.95, 40.76]]],
};

function recentRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 70 * 24 * 3600 * 1000);
  return { from: from.toISOString().slice(0, 10) + "T00:00:00Z", to: to.toISOString().slice(0, 10) + "T00:00:00Z" };
}

const BAKED = {
  data: [
    {
      interval: { from: "2026-08-01T00:00:00Z", to: "2026-08-13T00:00:00Z" },
      outputs: {
        indices: {
          bands: {
            B0: { stats: { min: 0.1, max: 0.7, mean: 0.42, stDev: 0.12, sampleCount: 1840, percentiles: { "50.0": 0.41 } } },
            B1: { stats: { min: -0.3, max: 0.2, mean: -0.05, stDev: 0.09, sampleCount: 1840, percentiles: { "50.0": -0.04 } } },
            B2: { stats: { min: -0.2, max: 0.3, mean: 0.03, stDev: 0.08, sampleCount: 1840, percentiles: { "50.0": 0.02 } } },
          },
        },
        dataMask: { bands: { B0: { stats: { min: 0, max: 1, mean: 0.92, sampleCount: 2000 } } } },
      },
    },
  ],
  status: "OK",
};

function check(name, cond, detail = "") {
  const mark = cond ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  return cond;
}

// Mirrors the assumptions in src/lib/satellite/sentinelhub-provider.ts
function inspect(json) {
  console.log("\nResponse shape inspection");
  console.log("─".repeat(52));
  let ok = true;
  ok = check("top-level `data` is a non-empty array", Array.isArray(json?.data) && json.data.length > 0) && ok;
  if (!Array.isArray(json?.data) || json.data.length === 0) return ok;

  const item = json.data[0];
  console.log(`  interval.from = ${item?.interval?.from ?? "(missing)"}`);
  ok = check("interval.from present", typeof item?.interval?.from === "string") && ok;

  const bands = item?.outputs?.indices?.bands;
  console.log(`  outputs.indices.bands keys = ${bands ? Object.keys(bands).join(", ") : "(missing)"}`);
  ok = check("indices bands B0/B1/B2 present", Boolean(bands?.B0 && bands?.B1 && bands?.B2)) && ok;

  const s0 = bands?.B0?.stats;
  ok = check("B0.stats.mean is a number", typeof s0?.mean === "number", s0 ? `mean=${s0.mean}` : "") && ok;

  const pctKeys = s0?.percentiles ? Object.keys(s0.percentiles) : [];
  console.log(`  B0.stats.percentiles keys = ${pctKeys.length ? pctKeys.join(", ") : "(none)"}`);
  const has50 = pctKeys.includes("50.0") || pctKeys.includes("50");
  check("median percentile present (key '50.0' or '50')", has50,
    pctKeys.includes("50.0") ? "key is '50.0' (parser matches)" :
    pctKeys.includes("50") ? "key is '50' — parser already falls back to this" :
    "NOT found — request percentiles or fall back to mean");

  const maskStats = item?.outputs?.dataMask?.bands?.B0?.stats;
  ok = check("dataMask.B0.stats.sampleCount is a number", typeof maskStats?.sampleCount === "number",
    maskStats ? `sampleCount=${maskStats.sampleCount}` : "missing") && ok;

  if (typeof s0?.sampleCount === "number" && typeof maskStats?.sampleCount === "number" && maskStats.sampleCount > 0) {
    const validPct = (s0.sampleCount / maskStats.sampleCount) * 100;
    console.log(`  derived validPixelPercent (B0 / dataMask) = ${validPct.toFixed(1)}%`);
  }

  console.log("─".repeat(52));
  console.log(ok ? "RESULT: parser assumptions hold for this response ✓" : "RESULT: parser needs adjustment — see FAILs above ✗");
  return ok;
}

async function getToken(id, secret) {
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`auth failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function live() {
  const id = process.env.SENTINELHUB_CLIENT_ID;
  const secret = process.env.SENTINELHUB_CLIENT_SECRET;
  if (!id || !secret) {
    console.error("Set SENTINELHUB_CLIENT_ID and SENTINELHUB_CLIENT_SECRET, or run with --self-test.");
    process.exit(2);
  }
  console.log("Authenticating with CDSE…");
  const token = await getToken(id, secret);
  console.log("Token acquired (not printed). Requesting statistics…");
  const reqBody = {
    input: {
      bounds: { geometry: SAMPLE_GEOMETRY, properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" } },
      data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
    },
    aggregation: {
      timeRange: recentRange(),
      aggregationInterval: { of: INTERVAL },
      evalscript: EVALSCRIPT,
      resx: 10,
      resy: 10,
    },
    calculations: { indices: { statistics: { default: { percentiles: { k: [50] } } } } },
  };
  const res = await fetch(`${BASE}/api/v1/statistics`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(reqBody),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`statistics failed: ${res.status}\n${text.slice(0, 600)}`);
    process.exit(1);
  }
  const json = JSON.parse(text);
  console.log(`\nIntervals returned: ${json?.data?.length ?? 0}`);
  const ok = inspect(json);
  process.exit(ok ? 0 : 1);
}

const arg = process.argv[2];
if (arg === "--self-test") {
  console.log("SELF-TEST (offline, baked response)");
  const ok = inspect(BAKED);
  process.exit(ok ? 0 : 1);
} else if (arg === "--help" || arg === "-h") {
  console.log("node scripts/validate-cdse.mjs [--self-test]");
  process.exit(0);
} else {
  live();
}
