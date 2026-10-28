import type { GeoJSONPolygon, Position } from "./types";
import { SQ_M_PER_ACRE } from "./area";

// Build a square AOI polygon of a given area centred on a point.
//
// WHY THIS EXISTS: the $9 single-site check takes an address (or coordinates)
// plus an approximate site size, not a hand-drawn polygon — that's the right
// friction level for a one-time tripwire. We turn that point + size into a
// CRS84 polygon the satellite provider can read.
//
// CRITICAL (the same lesson the Statistical API taught us): degrees are NOT
// metres. One degree of latitude is ~111,320 m everywhere, but one degree of
// longitude shrinks with latitude (× cos(lat)). Converting the half-side from
// metres to degrees with this correction is what keeps the box an actual square
// on the ground instead of a sliver near the poles.

const M_PER_DEG_LAT = 111_320;

/** Clamp requested acres into a sane range for 10 m-class analysis. */
export function clampAcres(acres: number): number {
  if (!Number.isFinite(acres) || acres <= 0) return 5;
  return Math.min(Math.max(acres, 0.5), 2000);
}

export function squarePolygonAroundPoint(lat: number, lng: number, acres: number): GeoJSONPolygon {
  const a = clampAcres(acres);
  const sideMeters = Math.sqrt(a * SQ_M_PER_ACRE);
  const halfMeters = sideMeters / 2;

  const dLat = halfMeters / M_PER_DEG_LAT;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const safeCos = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat;
  const dLon = halfMeters / (M_PER_DEG_LAT * safeCos);

  const ring: Position[] = [
    [lng - dLon, lat - dLat],
    [lng + dLon, lat - dLat],
    [lng + dLon, lat + dLat],
    [lng - dLon, lat + dLat],
    [lng - dLon, lat - dLat], // closing point
  ];

  return { type: "Polygon", coordinates: [ring] };
}
