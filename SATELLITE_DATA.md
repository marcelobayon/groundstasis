# Satellite data

## Source

Ground Stasis is built around **Copernicus Sentinel-2 Level-2A** surface-reflectance imagery.

- Sentinel-2 provides multispectral imagery at **10 m and 20 m** spatial resolutions. *(established fact)*
- Bands used: **B02** blue (10 m), **B04** red (10 m), **B08** NIR (10 m), **B11** SWIR (**20 m**).
- **B11 is native 20 m.** When combined with 10 m bands it is resampled to a common 10 m working grid.
  B11 is **not** native 10 m — the code and docs never claim otherwise.
- Level-2A (surface reflectance) is preferred over raw Level-1C.
- Revisit is every few days, but a **usable, cloud-free** observation is **not guaranteed** on any
  pass. Clouds, haze, shadow, snow, and acquisition conditions create gaps. _No new image ≠ construction stopped._

## Why the Statistical API (not raster processing)

The MVP uses the Sentinel Hub **Statistical API** on the Copernicus Data Space Ecosystem (CDSE). It
computes statistics (mean / stDev / percentiles) for a custom index **server-side**, over the site
polygon, and returns the valid-pixel sample count after applying the Scene Classification (SCL) cloud
mask.

This means Ground Stasis does **not** download rasters or run its own cloud masking for the MVP — the
single biggest driver of cost and complexity is removed, and the whole thing runs on cheap serverless
infrastructure. The provider interface still allows a raster provider later (see below) if pixel-level
control is ever required.

## Provider abstraction

`src/lib/satellite/provider.ts` defines `SatelliteProvider`:

```ts
interface SatelliteProvider {
  name: string;
  isDemo: boolean;
  isConfigured(): boolean;
  getAvailableObservations(site, range): Promise<Observation[]>;
  getObservationMetadata(id): Promise<ObservationMetadata | null>;
  getPreview(site, id): Promise<PreviewImage | null>;
  getBandData?(id, bands): Promise<number[][] | null>;   // optional, raster-only
  getCloudMask?(id): Promise<number[] | null>;           // optional, raster-only
}
```

Implementations:

- **`DemoProvider`** — serves the synthetic `DEMO_SITE` timeline, always `isDemo: true`. Default.
- **`SentinelHubProvider`** — the CDSE Statistical API adapter (below).

`getSatelliteProvider()` picks by `SATELLITE_PROVIDER` env and falls back to demo if the live provider
is selected but not configured (the app never crashes for want of a key).

## CDSE authentication

OAuth2 **client credentials**:

- Register at `https://dataspace.copernicus.eu` → Dashboard → User Settings → **OAuth clients**.
- Token endpoint: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
- API base: `https://sh.dataspace.copernicus.eu`
- The provider caches the bearer token until shortly before expiry.

## The request

`POST {base}/api/v1/statistics` with the site polygon as `input.bounds.geometry`, `sentinel-2-l2a`
as the data source, a time range, an `aggregationInterval` (default `P12D`), `resx/resy = 10`, and an
evalscript that outputs the three indices plus a `dataMask` driven by SCL:

```js
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02","B04","B08","B11","SCL","dataMask"] }],
    output: [{ id: "indices", bands: 3, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }]
  };
}
function evaluatePixel(s) {
  let ndvi = index(s.B08, s.B04);
  let ndbi = index(s.B11, s.B08);
  let den  = (s.B11 + s.B04) + (s.B08 + s.B02);
  let bsi  = den === 0 ? 0 : ((s.B11 + s.B04) - (s.B08 + s.B02)) / den;
  var bad  = (s.SCL==3 || s.SCL==8 || s.SCL==9 || s.SCL==10 || s.SCL==11); // shadow/cloud/cirrus/snow
  var valid= (s.dataMask==1 && !bad) ? 1 : 0;
  return { indices: [ndvi, ndbi, bsi], dataMask: [valid] };
}
```

Each returned interval becomes one `Observation`. `validPixelPercent` is derived from the index
sample count vs the data-mask count; `cloudPercent` is the excluded fraction (a documented proxy for
SCL-excluded + no-data).

> Endpoints and auth were verified against the CDSE docs. The **response field names**
> (`outputs`/`bands`/`stats`/`percentiles`) should be re-validated against a live response the first
> time real credentials are added — the parser in `sentinelhub-provider.ts` is written defensively
> for exactly that reason.

## Replacing or adding a provider

Implement `SatelliteProvider` and register it in `getSatelliteProvider()`. To add a **raster**
provider (e.g. reading Cloud-Optimized GeoTIFFs via a STAC catalog for pixel-level control), implement
the optional `getBandData`/`getCloudMask` and feed the arrays to `siteMetricsFromScene()` in
`src/lib/analysis/indices.ts` — the engine already computes site statistics from raster scenes and is
unit-tested on synthetic arrays. Landsat and Sentinel-1 SAR would slot in the same way. Do **not**
purchase commercial imagery for the MVP.

## PostGIS note

For the MVP, site geometry is stored as GeoJSON (`Json`) in Postgres. When spatial queries are needed,
upgrade `Site.geometryGeojson` to a PostGIS `geometry` column with a GiST index. The analysis engine
is unaffected — it consumes statistics, not geometry.
