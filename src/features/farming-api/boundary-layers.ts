import type { BoundaryPosition, ZoneBoundary } from "./zone-map-contract";
import { boundaryRings } from "./boundary-geometry";

/** Pure description of what the map draws for zone boundaries; the map view only feeds it to the SDK. */
export const BOUNDARY_SOURCE = "zone-boundaries", BOUNDARY_FILL = "zone-boundaries-fill", BOUNDARY_LINE = "zone-boundaries-line";
// The SDK cannot read CSS variables: this is the teal of `farm` in the design tokens.
export const BOUNDARY_COLOR = "#0a6f6c";

export type BoundaryLabel = { text: string; position: BoundaryPosition };
export type BoundaryLayers = {
  data: { type: "FeatureCollection"; features: { type: "Feature"; properties: { zoneCode: string; name: string }; geometry: { type: "Polygon"; coordinates: BoundaryPosition[][] } }[] };
  labels: BoundaryLabel[];
  /** Every corner, to fit the view to the polygons. */
  positions: BoundaryPosition[];
};

/** Area-weighted centre of a ring; the average of the corners when the ring has no area. */
export function ringCentre(ring: readonly BoundaryPosition[]): BoundaryPosition {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length], cross = x0 * y1 - x1 * y0;
    area += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-12) return [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length];
  return [cx / (3 * area), cy / (3 * area)];
}

/**
 * Polygons of the zones that have a boundary, one feature per khu. The label is the khu name; an unnamed khu of a zone with several is
 * "Khu n", and the zone code leads the label when more than one zone is drawn. Undefined when no zone has a boundary (the map draws nothing).
 */
export function buildBoundaryLayers(zones: readonly { code: string; boundary: ZoneBoundary | null }[]): BoundaryLayers | undefined {
  const drawn = zones.filter(zone => boundaryRings(zone.boundary).length);
  if (!drawn.length) return undefined;
  const layers: BoundaryLayers = { data: { type: "FeatureCollection", features: [] }, labels: [], positions: [] };
  for (const zone of drawn) zone.boundary!.features.forEach((feature, index, all) => {
    const ring = feature.geometry.coordinates[0], name = feature.properties.name ?? (all.length > 1 ? `Khu ${index + 1}` : "");
    const text = [drawn.length > 1 ? zone.code : "", name].filter(Boolean).join(" · ");
    layers.data.features.push({ type: "Feature", properties: { zoneCode: zone.code, name }, geometry: { type: "Polygon", coordinates: [ring] } });
    layers.positions.push(...ring);
    if (text) layers.labels.push({ text, position: ringCentre(ring) });
  });
  return layers;
}

/** Fill and outline layer specs of the boundary source (fill below the outline). */
export const boundaryLayerSpecs = () => [
  { id: BOUNDARY_FILL, type: "fill" as const, source: BOUNDARY_SOURCE, paint: { "fill-color": BOUNDARY_COLOR, "fill-opacity": 0.18 } },
  { id: BOUNDARY_LINE, type: "line" as const, source: BOUNDARY_SOURCE, paint: { "line-color": BOUNDARY_COLOR, "line-width": 3 } },
];
