import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import * as c from "./contracts";
import { waterRepository } from "./water-measurement-shared";

/** The zone the list is read for; the backend lists per zone, so every row belongs to it. */
export type WaterZoneRef = { id: string; code: string; name: string };
export type WaterRow = c.WaterHistory["items"][number];
export type WaterSortKey = "time" | "raft" | "ph" | "salinity" | "temperature" | "alert" | "status" | "by";
export type WaterFilters = { search: string; status: string; raftId: string; exceeded: boolean };
/** Hiệu lực is the working default; an empty status means "all" in the filter rail. */
export const emptyWaterFilters: WaterFilters = { search: "", status: "Active", raftId: "", exceeded: false };

const PAGE = 100, MAX_PAGES = 30;
/** `zoneId` says which zone the rows were read for, so a slow answer of the previous zone is never shown under the new one. */
/** A measurement that remembers its zone, so one list can hold the measurements of several zones. */
export type ZonedWaterRow = WaterRow & { zone: WaterZoneRef };
/** `ALL_WATER_ZONES` is the `zoneId` of a list that joins every zone chosen in the header. */
export const ALL_WATER_ZONES = "__all";
export type WaterHistoryData = { zoneId: string; items: ZonedWaterRow[]; total: number; truncated: boolean };
export const noWaterHistory: WaterHistoryData = { zoneId: "", items: [], total: 0, truncated: false };

/**
 * The backend filters by zone, dates and status only (newest first, 100 per page), so the screen reads every page of the
 * chosen range once and does raft, threshold, search, sort and paging over the whole set on the client.
 */
export async function readAllWaterHistory(query: { zoneId: string; from: string; to: string; status: string }, signal: AbortSignal, zone?: WaterZoneRef): Promise<WorkspaceResult<WaterHistoryData>> {
  const read = await readRows(query, signal);
  if (read.status !== "success") return read;
  const ref = zone ?? { id: query.zoneId, code: "", name: "" };
  return { status: "success", data: { zoneId: query.zoneId, items: read.data.items.map(row => ({ ...row, zone: ref })), total: read.data.total, truncated: read.data.truncated } };
}

/** The measurements of several zones in one list: each zone is read, a zone the account may not read is left out, and the list fails only when none could be read. */
export async function readWaterOfZones(zones: readonly WaterZoneRef[], query: { from: string; to: string; status: string }, signal: AbortSignal): Promise<WorkspaceResult<WaterHistoryData>> {
  const results = await Promise.all(zones.map(zone => readAllWaterHistory({ ...query, zoneId: zone.id }, signal, zone)));
  const read = results.flatMap(result => result.status === "success" ? [result.data] : []);
  const failed = results.find(result => result.status !== "success");
  if (!read.length && failed) return failed;
  const items = read.flatMap(data => data.items);
  return { status: "success", data: { zoneId: ALL_WATER_ZONES, items, total: items.length, truncated: read.some(data => data.truncated) } };
}

async function readRows(query: { zoneId: string; from: string; to: string; status: string }, signal: AbortSignal): Promise<WorkspaceResult<{ items: WaterRow[]; total: number; truncated: boolean }>> {
  const items: WaterRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (signal.aborted) return { status: "error", httpStatus: 0, uncertain: false };
    const result = await waterRepository.read("list", { ...query, status: query.status || "All", page: String(page), pageSize: String(PAGE) }, c.waterHistorySchema, signal);
    if (result.status !== "success") return result;
    items.push(...result.data.items);
    if (!result.data.items.length || items.length >= result.data.total) return { status: "success", data: { items, total: result.data.total, truncated: false } };
  }
  return { status: "success", data: { items, total: items.length, truncated: true } };
}

/** A measurement is "outside" when the backend flagged values beyond the thresholds it was recorded with. */
export const isOutside = (row: WaterRow) => row.valuesOutside.length > 0 || !!row.violatedValues;

/** A zone with no thresholds judges nothing: its rows are neither inside nor outside. */
export const hasNoThresholds = (row: WaterRow) => Object.values(row.thresholdsUsed).every(value => value === null || value === undefined);

export function filterWater<T extends WaterRow>(rows: readonly T[], filters: WaterFilters): T[] {
  const term = foldVietnamese(filters.search.trim());
  return rows.filter(row => (!filters.raftId || row.raftId === filters.raftId) && (!filters.exceeded || isOutside(row))
    && (!term || foldVietnamese(`${row.raftCode} ${row.measuredBy?.name ?? ""}`).includes(term)));
}

/** Distinct rafts of the loaded measurements, for the raft filter. */
export function raftsOf(rows: readonly Pick<WaterRow, "raftId" | "raftCode">[]): [string, string][] {
  const found = new Map(rows.map(row => [row.raftId, row.raftCode] as const));
  return [...found].sort((a, b) => a[1].localeCompare(b[1], "vi", { numeric: true }));
}

const sortValue: Record<WaterSortKey, (row: WaterRow) => number | string> = {
  time: row => Date.parse(row.measuredAt), raft: row => row.raftCode, ph: row => row.ph, salinity: row => row.salinity, temperature: row => row.temperature,
  alert: row => Number(isOutside(row)), status: row => row.statusCode, by: row => row.measuredBy?.name ?? "",
};

export function sortWater<T extends WaterRow>(rows: readonly T[], key: WaterSortKey, direction: "asc" | "desc"): T[] {
  const pick = sortValue[key], sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = pick(a), right = pick(b);
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "vi", { numeric: true });
    return order * sign || Date.parse(b.measuredAt) - Date.parse(a.measuredAt);
  });
}

/** Where a recorded value sits against the thresholds it was judged with; no bound means it cannot be outside. */
export function againstThreshold(value: number, min: number | null, max: number | null): "none" | "ok" | "low" | "high" {
  if (min === null && max === null) return "none";
  if (min !== null && value < min) return "low";
  return max !== null && value > max ? "high" : "ok";
}
