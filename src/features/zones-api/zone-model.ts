import { z } from "zod";
import { farmingZoneListItemSchema, farmingZoneViewSchema, type FarmingZoneListItemDto, type FarmingZoneViewDto } from "@/features/farming-zones/api/farming-zone-contract.schemas";
import { createWorkspaceRepository, type WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { foldVietnamese } from "@/shared/presentation/fold-text";

export type ZoneRow = FarmingZoneListItemDto;
export type ZoneDetail = FarmingZoneViewDto;
export const IN_USE = 101, DISCONTINUED = 102;
export const zoneStatusLabel = (statusId: number) => statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng";
export const licenseFilterOptions = [["Valid", "Còn hiệu lực"], ["ExpiringSoon", "Sắp hết hạn"], ["Expired", "Hết hạn"], ["NotYetEffective", "Chưa có hiệu lực"], ["Missing", "Thiếu hồ sơ"]] as const;

const invalid = { status: "error", httpStatus: 502, uncertain: false } as const;
/** Reads every zone once; search, filter, sort and paging then run over the whole set on the client. */
export async function readAllZones(signal: AbortSignal): Promise<WorkspaceResult<ZoneRow[]>> {
  const result = await loadOptions("zones", signal);
  if (result.status !== "success") return result;
  const parsed = z.array(farmingZoneListItemSchema).safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
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

export type ZoneDraft = Record<"code" | "name" | "location" | "latitude" | "longitude" | "area", string>;
export type ZoneField = keyof ZoneDraft;
export const zoneFields: readonly (readonly [ZoneField, string])[] = [["code", "Mã vùng"], ["name", "Tên vùng"], ["location", "Vị trí"], ["area", "Diện tích (ha)"], ["latitude", "Vĩ độ"], ["longitude", "Kinh độ"]];
export const emptyZoneDraft: ZoneDraft = { code: "", name: "", location: "", latitude: "", longitude: "", area: "" };
const text = (value: string | number | null | undefined) => value === null || value === undefined ? "" : String(value);
export const zoneDraftOf = (zone: ZoneDetail): ZoneDraft => ({ code: zone.code, name: zone.name, location: text(zone.location), latitude: text(zone.latitude), longitude: text(zone.longitude), area: text(zone.area) });
const toNumber = (value: string) => Number(value.trim().replace(",", "."));

/** Same required fields as before the redesign; numbers additionally keep to the ranges the API returns. */
export function validateZoneDraft(draft: ZoneDraft): Partial<Record<ZoneField, string>> {
  const errors: Partial<Record<ZoneField, string>> = {};
  for (const [key, label] of zoneFields) if (!draft[key].trim()) errors[key] = `Nhập ${label.toLocaleLowerCase("vi")}.`;
  const range = (key: "latitude" | "longitude" | "area", min: number, max: number) => {
    if (errors[key]) return;
    const value = toNumber(draft[key]);
    if (!Number.isFinite(value) || value < min || value > max) errors[key] = `Nhập số từ ${min} đến ${max}.`;
  };
  range("latitude", -90, 90); range("longitude", -180, 180); range("area", 0, 1_000_000);
  return errors;
}
export function zoneBody(draft: ZoneDraft, rowVersion?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: draft.code.trim(), name: draft.name.trim(), location: draft.location.trim(),
    latitude: toNumber(draft.latitude), longitude: toNumber(draft.longitude), area: toNumber(draft.area),
  };
  if (rowVersion) body.rowVersion = rowVersion;
  return body;
}
