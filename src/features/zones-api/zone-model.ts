import { z } from "zod";
import { farmingZoneListItemSchema, farmingZoneViewSchema, type FarmingZoneListItemDto, type FarmingZoneViewDto } from "@/features/farming-zones/api/farming-zone-contract.schemas";
import { createWorkspaceRepository, type WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { loadInUseZones } from "./in-use-zones";
import { foldVietnamese } from "@/shared/presentation/fold-text";

export type ZoneRow = FarmingZoneListItemDto;
export type ZoneDetail = FarmingZoneViewDto;
export const IN_USE = 101, DISCONTINUED = 102;
export const zoneStatusLabel = (statusId: number) => statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng";
export const licenseFilterOptions = [["Valid", "Còn hiệu lực"], ["ExpiringSoon", "Sắp hết hạn"], ["Expired", "Hết hạn"], ["NotYetEffective", "Chưa có hiệu lực"], ["Missing", "Thiếu hồ sơ"]] as const;

const invalid = { status: "error", httpStatus: 502, uncertain: false } as const;
const parseRows = (result: WorkspaceResult<unknown>): WorkspaceResult<ZoneRow[]> => {
  if (result.status !== "success") return result;
  const parsed = z.array(farmingZoneListItemSchema).safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
};
/** Reads every zone, discontinued ones included, once; search, filter, sort and paging then run over the whole set on the client. Only the Vùng nuôi screen needs this. */
export async function readAllZones(signal: AbortSignal): Promise<WorkspaceResult<ZoneRow[]>> {
  return parseRows(await loadOptions("zones", signal));
}
/** The zones every other screen may offer: In Use only. */
export async function readInUseZones(signal: AbortSignal): Promise<WorkspaceResult<ZoneRow[]>> {
  return parseRows(await loadInUseZones(signal));
}
export async function readZoneDetail(id: string, signal?: AbortSignal): Promise<WorkspaceResult<ZoneDetail>> {
  const result = await createWorkspaceRepository("zones").detail(id, signal);
  if (result.status !== "success") return result;
  const parsed = farmingZoneViewSchema.safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
}

/** A successful write answers with the zone detail; anything else is treated as unusable and the caller reloads. */
export const parseZoneDetail = (value: unknown): ZoneDetail | undefined => {
  const parsed = farmingZoneViewSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export type ZoneSortKey = "code" | "name" | "location" | "area" | "rafts" | "license" | "status" | "water";
export type ZoneFilters = { search: string; statusId: string; license: string };
export const emptyZoneFilters: ZoneFilters = { search: "", statusId: "", license: "" };

/** The list only has a badge (Expired / ExpiringSoon); `flags` is the flag computed from each zone's licence overview. No badge is NOT "Missing". */
export const licenseOf = (row: ZoneRow, flags?: ReadonlyMap<string, string>): string | null => flags?.get(row.id) ?? row.licenseState ?? null;
export function filterZones(rows: readonly ZoneRow[], filters: ZoneFilters, flags?: ReadonlyMap<string, string>): ZoneRow[] {
  const term = foldVietnamese(filters.search.trim());
  return rows.filter(row => (!filters.statusId || String(row.statusId) === filters.statusId)
    && (!filters.license || licenseOf(row, flags) === filters.license)
    && (!term || foldVietnamese(`${row.code} ${row.name} ${row.location ?? ""}`).includes(term)));
}
const sortValue = (row: ZoneRow, key: ZoneSortKey, flags?: ReadonlyMap<string, string>): string | number => {
  switch (key) {
    case "area": return row.area ?? -1;
    case "rafts": return row.inUseRaftCount;
    case "license": return licenseOf(row, flags) ?? "ZZ";
    case "status": return row.statusId;
    case "location": return row.location ?? "";
    default: return row[key as "code" | "name"];
  }
};
/** `latestWater` maps zone id to its newest measurement time; it only matters for the `water` column. */
export function sortZones(rows: readonly ZoneRow[], key: ZoneSortKey, direction: "asc" | "desc", latestWater?: ReadonlyMap<string, string | null>, flags?: ReadonlyMap<string, string>): ZoneRow[] {
  const sign = direction === "asc" ? 1 : -1;
  const value = (row: ZoneRow) => key === "water" ? Date.parse(latestWater?.get(row.id) ?? "") || 0 : sortValue(row, key, flags);
  return [...rows].sort((a, b) => {
    const left = value(a), right = value(b);
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "vi", { numeric: true });
    return sign * (order || a.code.localeCompare(b.code, "vi", { numeric: true }));
  });
}

export type ZoneDraft = Record<"code" | "name" | "location" | "area", string>;
export type ZoneField = keyof ZoneDraft;
/** Only the code and the name are required; Địa điểm and Diện tích are optional and may be filled from the licence map. */
export const zoneFields: readonly (readonly [ZoneField, string])[] = [["code", "Mã vùng"], ["name", "Tên vùng"], ["location", "Địa điểm"], ["area", "Diện tích (ha)"]];
export const requiredZoneFields: readonly ZoneField[] = ["code", "name"];
export const emptyZoneDraft: ZoneDraft = { code: "", name: "", location: "", area: "" };
export const MAX_ZONE_LOCATION = 500, MAX_ZONE_AREA_HA = 1_000_000;
const text = (value: string | number | null | undefined) => value === null || value === undefined ? "" : String(value);
export const zoneDraftOf = (zone: ZoneDetail): ZoneDraft => ({ code: zone.code, name: zone.name, location: text(zone.location), area: text(zone.area) });
const toNumber = (value: string) => Number(value.trim().replace(",", "."));

/** Code and name are required; a location, when typed, has a length limit and an area, when typed, is a number above 0. The pin is not part of the form: the licence-map boundary sets it. */
export function validateZoneDraft(draft: ZoneDraft): Partial<Record<ZoneField, string>> {
  const errors: Partial<Record<ZoneField, string>> = {};
  for (const [key, label] of zoneFields) if (requiredZoneFields.includes(key) && !draft[key].trim()) errors[key] = `Nhập ${label.toLocaleLowerCase("vi")}.`;
  if (draft.location.trim().length > MAX_ZONE_LOCATION) errors.location = `Địa điểm tối đa ${MAX_ZONE_LOCATION} ký tự.`;
  if (draft.area.trim()) {
    const value = toNumber(draft.area);
    if (!Number.isFinite(value) || value <= 0 || value > MAX_ZONE_AREA_HA) errors.area = `Nhập số lớn hơn 0 và không quá ${MAX_ZONE_AREA_HA.toLocaleString("vi-VN")}, hoặc để trống.`;
  }
  return errors;
}
/** An empty location is sent blank and an empty area as null (both mean "none"). An edit never sends the pin: the server keeps it. */
export function zoneBody(draft: ZoneDraft, rowVersion?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: draft.code.trim(), name: draft.name.trim(), location: draft.location.trim(), area: draft.area.trim() ? toNumber(draft.area) : null,
  };
  if (rowVersion) body.rowVersion = rowVersion;
  return body;
}

/** Which fields of the form hold a value that came from reading the licence map (and may therefore be replaced by the next read). */
export type MapFilled = Record<"location" | "area", boolean>;
export const noMapFilled: MapFilled = { location: false, area: false };
/**
 * Puts what a licence-map read suggests into the form: a field is filled only when it is empty or still holds the value of a previous read,
 * so a value the user typed is never overwritten. The zone name is never taken from the map. A suggestion the photo did not show (null) changes nothing.
 */
export function applyMapPrefill(draft: ZoneDraft, filled: MapFilled, prefill: { areaHa: number | null; location: string | null }): { draft: ZoneDraft; filled: MapFilled } {
  const next = { draft: { ...draft }, filled: { ...filled } };
  const suggestions: [keyof MapFilled, string | null][] = [["location", prefill.location], ["area", prefill.areaHa === null ? null : String(prefill.areaHa)]];
  for (const [field, value] of suggestions) {
    if (value === null || !value.trim()) continue;
    if (!draft[field].trim() || filled[field]) { next.draft[field] = value; next.filled[field] = true; }
  }
  return next;
}
