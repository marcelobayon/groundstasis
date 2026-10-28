// Turn a lender-supplied address (or pasted coordinates) into a lat/lng.
//
// The $9 check needs the lowest-friction site entry possible, so we accept a
// plain street address and geocode it server-side. We also accept coordinates
// pasted directly ("41.8781, -87.6298") so the flow still works if geocoding is
// unavailable. Geocoding is best-effort: any failure returns null and the UI
// falls back to asking for coordinates — it NEVER throws into the paid flow.
//
// Geocoder: OpenStreetMap Nominatim (no key). Low volume only; we send a real
// User-Agent per their usage policy. Swappable for a commercial geocoder later.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName?: string;
}

const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Parse "lat, lng" (or "lat lng"). Returns null if it isn't a coordinate pair. */
export function parseLatLng(input: string): GeocodeResult | null {
  const m = input.match(COORD_RE);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function geocodeAddress(
  address: string,
  opts: { timeoutMs?: number } = {}
): Promise<GeocodeResult | null> {
  const q = (address ?? "").trim();
  if (!q) return null;

  // Coordinates pasted directly need no network call.
  const direct = parseLatLng(q);
  if (direct) return direct;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 7000);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GroundStasis/1.0 (+https://groundstasis.com; hello@groundstasis.com)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const lat = Number(arr[0].lat);
    const lng = Number(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: arr[0].display_name };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
