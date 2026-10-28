import type { GeoJSONPolygon } from "./types";

export interface GeometryValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an untrusted GeoJSON Polygon from the client. Rejects anything that
 * is not a closed polygon with in-range coordinates. This runs server-side on
 * every site create/update (never trust client geometry).
 */
export function validatePolygon(input: unknown): GeometryValidation {
  const errors: string[] = [];
  const g = input as GeoJSONPolygon | null;

  if (!g || typeof g !== "object" || g.type !== "Polygon") {
    return { valid: false, errors: ["Geometry must be a GeoJSON Polygon."] };
  }
  if (!Array.isArray(g.coordinates) || g.coordinates.length === 0) {
    return { valid: false, errors: ["Polygon must have at least one linear ring."] };
  }

  const ring = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    errors.push("Exterior ring must have at least 4 positions (3 corners + a closing point).");
    return { valid: false, errors };
  }

  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      errors.push("Each position must be a [longitude, latitude] pair of finite numbers.");
      return { valid: false, errors };
    }
    const [lon, lat] = p;
    if (lon < -180 || lon > 180) errors.push("Longitude out of range [-180, 180].");
    if (lat < -90 || lat > 90) errors.push("Latitude out of range [-90, 90].");
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    errors.push("Ring must be closed: the first and last positions must be identical.");
  }

  return { valid: errors.length === 0, errors };
}
