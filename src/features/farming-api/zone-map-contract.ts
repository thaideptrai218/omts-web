import { z } from "zod";

export type BoundaryPosition = [longitude: number, latitude: number];
export type ZoneBoundaryFeature = { type: "Feature"; properties: { name?: string }; geometry: { type: "Polygon"; coordinates: [BoundaryPosition[]] } };
/** Licensed sea area of a zone as RFC 7946 GeoJSON in WGS84: 1 to 10 polygons of one ring each. */
export type ZoneBoundary = { type: "FeatureCollection"; features: ZoneBoundaryFeature[] };

const MAX_AREAS = 10, MIN_CORNERS = 3;
const isPosition = (value: unknown): value is number[] => Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number"
  && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;

function parseFeature(value: unknown): ZoneBoundaryFeature | undefined {
  if (!value || typeof value !== "object") return undefined;
  const feature = value as { type?: unknown; geometry?: { type?: unknown; coordinates?: unknown } | null; properties?: { name?: unknown } | null };
  if (feature.type !== "Feature" || feature.geometry?.type !== "Polygon" || !Array.isArray(feature.geometry.coordinates)) return undefined;
  const ring: unknown = feature.geometry.coordinates[0];
  if (!Array.isArray(ring) || !ring.every(isPosition)) return undefined;
  const corners: BoundaryPosition[] = ring.map(position => [position[0], position[1]]);
  if (new Set(corners.map(([lon, lat]) => `${lon},${lat}`)).size < MIN_CORNERS) return undefined;
  const name = typeof feature.properties?.name === "string" ? feature.properties.name.trim() : "";
  return { type: "Feature", properties: name ? { name } : {}, geometry: { type: "Polygon", coordinates: [corners] } };
}

/** Tolerant read of a zone boundary: anything that is not a valid set of 1 to 10 polygons (wrong type, bad position, too few corners) reads as "no boundary". */
export function parseZoneBoundary(value: unknown): ZoneBoundary | null {
  if (!value || typeof value !== "object") return null;
  const { type, features } = value as { type?: unknown; features?: unknown };
  if (type !== "FeatureCollection" || !Array.isArray(features) || features.length < 1 || features.length > MAX_AREAS) return null;
  const parsed = features.map(parseFeature);
  return parsed.every((feature): feature is ZoneBoundaryFeature => !!feature) ? { type: "FeatureCollection", features: parsed } : null;
}

const point = { latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable() };
export const zoneMapSchema = z.array(z.object({ id: z.guid(), code: z.string(), name: z.string(), ...point,
  statusId: z.number().int(), status: z.string(), boundary: z.unknown().optional().transform(parseZoneBoundary),
  rafts: z.array(z.object({ id: z.guid(), code: z.string(), ...point })) }));
export type MapZone = z.infer<typeof zoneMapSchema>[number];
export function mapPointUrl(point: { latitude: number | null; longitude: number | null }) {
  return point.latitude === null || point.longitude === null ? undefined
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`;
}
