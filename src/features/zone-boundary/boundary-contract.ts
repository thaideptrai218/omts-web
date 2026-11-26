import { z } from "zod";

/** One GeoJSON position: [longitude, latitude] in WGS84. */
export type BoundaryPosition = [number, number];

const position = z.array(z.number().finite()).min(2).transform(([longitude, latitude]): BoundaryPosition => [longitude, latitude]);
const boundaryFeature = z.object({
  type: z.literal("Feature"),
  /** Area name ("Khu 1") and the corner labels in ring order. */
  properties: z.object({ name: z.string().nullish().catch(null), corners: z.array(z.string()).nullish().catch(null) }).nullish().catch(null),
  /** One outer ring, first position equal to the last. */
  geometry: z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(3)).min(1) }),
});
const strictBoundary = z.object({ type: z.literal("FeatureCollection"), features: z.array(boundaryFeature).min(1).max(10) });

export type ZoneBoundaryFeature = z.output<typeof boundaryFeature>;
/** The licensed sea area of a zone: GeoJSON FeatureCollection (RFC 7946, WGS84), one Feature per khu on the map. */
export type ZoneBoundary = z.output<typeof strictBoundary>;

/** A zone's `boundary` as the API sends it. Tolerant on purpose: anything malformed becomes null so one bad boundary never fails the whole zone read. */
export const zoneBoundarySchema = z.unknown().transform((value): ZoneBoundary | null => {
  const parsed = strictBoundary.safeParse(value);
  return parsed.success ? parsed.data : null;
});

const nullable = <T extends z.ZodType>(schema: T) => schema.nullish().catch(null).transform((value): z.output<T> | null => value ?? null);
const finite = z.number().finite();

/** A corner as the server read it: X (northing), Y (easting) in VN-2000 metres; `lat`/`lon` are copied as written when the table has them. */
const scanCorner = z.object({ label: nullable(z.string().max(60)), x: nullable(finite), y: nullable(finite), lat: nullable(z.string().max(60)), lon: nullable(z.string().max(60)) });
const scanArea = z.object({
  name: nullable(z.string().max(200)), writtenAreaHa: nullable(finite), gridAreaHa: nullable(finite), areaMatches: nullable(z.boolean()),
  corners: z.array(scanCorner).max(300),
});
/** The corner tables and info table the server read from a photographed licence map. */
export const zoneMapReadingSchema = z.object({
  centralMeridian: nullable(finite), coordinateSystem: nullable(z.string().max(200)), location: nullable(z.string().max(600)), writtenTotalAreaHa: nullable(finite),
  zones: z.array(scanArea).max(30),
});
export type ZoneMapReading = z.output<typeof zoneMapReadingSchema>;
export type ZoneMapReadingCorner = z.output<typeof scanCorner>;

export const scanStartedSchema = z.object({ scanId: z.guid() });
export const scanStatusSchema = z.object({
  status: z.enum(["Pending", "Done", "Failed"]),
  errorCode: nullable(z.string().max(60)),
  reading: nullable(zoneMapReadingSchema),
});
export type ScanStatus = z.output<typeof scanStatusSchema>;

/** Non-blocking notices of a boundary save: the In Use rafts pinned outside the new boundary. Unknown codes are dropped. */
export const boundaryWarningSchema = z.object({
  code: z.literal("RAFTS_OUTSIDE_ZONE_BOUNDARY"),
  details: z.object({ count: z.number().int().nonnegative().catch(0), raftCodes: z.array(z.string().max(60)).max(500).catch([]) }).nullish().catch(null),
});
export type BoundaryWarning = z.output<typeof boundaryWarningSchema>;
export function projectBoundaryWarnings(saved: unknown): BoundaryWarning[] {
  const list = saved && typeof saved === "object" ? (saved as { warnings?: unknown }).warnings : undefined;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 10).flatMap(item => { const parsed = boundaryWarningSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
}
