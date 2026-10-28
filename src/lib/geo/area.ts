import type { GeoJSONPolygon, Position } from "./types";

// Geodesic polygon area using the spherical-excess approximation. Accurate to
// well within a percent at construction-site scale, with no dependencies.

const EARTH_RADIUS_M = 6378137; // WGS84 semi-major axis
export const SQ_M_PER_ACRE = 4046.8564224;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function ringAreaSqMeters(ring: Position[]): number {
  if (ring.length < 4) return 0; // need >= 3 distinct vertices + closing point
  let total = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % n];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function polygonAreaSqMeters(polygon: GeoJSONPolygon): number {
  if (!polygon.coordinates?.length) return 0;
  const [exterior, ...holes] = polygon.coordinates;
  let area = ringAreaSqMeters(exterior);
  for (const hole of holes) area -= ringAreaSqMeters(hole);
  return Math.max(0, area);
}

export function polygonAreaAcres(polygon: GeoJSONPolygon): number {
  return polygonAreaSqMeters(polygon) / SQ_M_PER_ACRE;
}
