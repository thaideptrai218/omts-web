import { z } from "zod";

/** Non-blocking notices the backend returns with a saved zone, raft pin or zone boundary (nothing is refused, the user should look at the map). */
export const coordinateWarning = z.object({
  code: z.enum(["COORDINATES_OUTSIDE_VIETNAM", "RAFT_FAR_FROM_ZONE", "RAFT_OUTSIDE_ZONE_BOUNDARY", "RAFTS_OUTSIDE_ZONE_BOUNDARY"]),
  details: z.object({
    distanceKm: z.number().finite().optional(), limitKm: z.number().finite().optional(), distanceM: z.number().finite().nonnegative().optional(),
    count: z.number().int().nonnegative().optional(), raftCodes: z.array(z.string().max(50)).max(100).optional(),
  }).nullish().catch(undefined),
});
export type CoordinateWarning = z.infer<typeof coordinateWarning>;

/** Allow-list of the `warnings` array of a saved answer; unknown codes and malformed items are dropped (older backends send none). */
export function projectCoordinateWarnings(saved: unknown): CoordinateWarning[] {
  const list = saved && typeof saved === "object" ? (saved as { warnings?: unknown }).warnings : undefined;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 5).flatMap(item => { const parsed = coordinateWarning.safeParse(item); return parsed.success ? [parsed.data] : []; });
}

const MAX_LISTED_RAFTS = 10;
const km = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
/** Vietnamese sentence of a warning. */
export function coordinateWarningText(warning: CoordinateWarning): string {
  if (warning.code === "COORDINATES_OUTSIDE_VIETNAM") return "Vị trí vừa chọn nằm ngoài Việt Nam. Hãy kiểm tra lại trên bản đồ.";
  if (warning.code === "RAFT_OUTSIDE_ZONE_BOUNDARY") {
    const metres = warning.details?.distanceM;
    return `Bè nằm ngoài ranh giới vùng${metres !== undefined ? ` ${Math.round(metres).toLocaleString("vi-VN")} m` : ""}. Hãy kiểm tra lại vị trí bè.`;
  }
  if (warning.code === "RAFTS_OUTSIDE_ZONE_BOUNDARY") {
    const codes = warning.details?.raftCodes ?? [], count = Math.max(warning.details?.count ?? codes.length, codes.length), shown = codes.slice(0, MAX_LISTED_RAFTS);
    return `${count} bè đang nằm ngoài ranh giới mới${shown.length ? `: ${shown.join(", ")}${count > shown.length ? "…" : "."}` : "."}`;
  }
  const distance = warning.details?.distanceKm, limit = warning.details?.limitKm;
  return `Bè cách vùng nuôi${distance !== undefined ? ` ${km(distance)} km` : " khá xa"}${limit !== undefined ? `, quá mức ${km(limit)} km` : ""}. Hãy kiểm tra lại vị trí bè.`;
}

/** Warning sentences carried by a saved record (the BFF adds `warnings` to the zone/raft it returns); empty when none. */
export function coordinateWarningTexts(record: unknown): string[] {
  return projectCoordinateWarnings(record).map(coordinateWarningText);
}
