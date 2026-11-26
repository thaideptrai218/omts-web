import type { BoundaryPosition, ZoneBoundary } from "./zone-map-contract";

/** Pure geometry of the licensed area: where a point lies against the polygons of a zone (no map, no network). */
export type GeoPoint = { latitude: number; longitude: number };
export type Placement = { inside: true } | { inside: false; distanceM: number };

/** The backend warns only for a point more than this far outside every area; the same slack keeps a pin on the edge "inside". */
export const OUTSIDE_TOLERANCE_M = 1;
const M_PER_DEG_LAT = 110_574, M_PER_DEG_LON_AT_EQUATOR = 111_320;

export const boundaryRings = (boundary: ZoneBoundary | null | undefined): BoundaryPosition[][] => boundary?.features.map(feature => feature.geometry.coordinates[0]) ?? [];

/** Ray casting: true when the point is inside the ring (ring may be open or closed). */
export function pointInRing(point: GeoPoint, ring: readonly BoundaryPosition[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point.latitude) !== (yj > point.latitude) && point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Metres from the point to the segment, on a local flat projection around the point (accurate for the few kilometres of a zone). */
function distanceToSegmentM(point: GeoPoint, a: BoundaryPosition, b: BoundaryPosition): number {
  const kx = M_PER_DEG_LON_AT_EQUATOR * Math.cos(point.latitude * Math.PI / 180);
  const ax = (a[0] - point.longitude) * kx, ay = (a[1] - point.latitude) * M_PER_DEG_LAT, bx = (b[0] - point.longitude) * kx, by = (b[1] - point.latitude) * M_PER_DEG_LAT;
  const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToRingM(point: GeoPoint, ring: readonly BoundaryPosition[]): number {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) best = Math.min(best, distanceToSegmentM(point, ring[i], ring[(i + 1) % ring.length]));
  return best;
}

/** Where the point is against the boundary; undefined when the zone has no boundary (nothing to compare with). */
export function placementOf(point: GeoPoint, boundary: ZoneBoundary | null | undefined): Placement | undefined {
  const rings = boundaryRings(boundary);
  if (!rings.length) return undefined;
  if (rings.some(ring => pointInRing(point, ring))) return { inside: true };
  const distance = Math.min(...rings.map(ring => distanceToRingM(point, ring)));
  return distance <= OUTSIDE_TOLERANCE_M ? { inside: true } : { inside: false, distanceM: Math.round(distance) };
}

export const isOutsideBoundary = (point: GeoPoint, boundary: ZoneBoundary | null | undefined) => placementOf(point, boundary)?.inside === false;

/** Live hint of the location picker. */
export function placementText(placement: Placement): string {
  return placement.inside ? "Trong ranh giới" : `Ngoài ranh giới ${placement.distanceM.toLocaleString("vi-VN")} m`;
}
