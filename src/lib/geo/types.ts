// Minimal GeoJSON geometry types (RFC 7946) used across the app.
// Positions are [longitude, latitude] in WGS84 (CRS84 / EPSG:4326).

export type Position = [number, number];

export interface GeoJSONPolygon {
  type: "Polygon";
  /** linear rings; the first is the exterior ring, following rings are holes */
  coordinates: Position[][];
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONPolygon;
  properties?: Record<string, unknown>;
}
