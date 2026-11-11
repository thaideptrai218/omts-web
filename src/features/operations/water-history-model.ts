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
export type WaterHistoryData = { zoneId: string; items: WaterRow[]; total: number; truncated: boolean };
export const noWaterHistory: WaterHistoryData = { zoneId: "", items: [], total: 0, truncated: false };

/**
 * The backend filters by zone, dates and status only (newest first, 100 per page), so the screen reads every page of the
 * chosen range once and does raft, threshold, search, sort and paging over the whole set on the client.
 */
export async function readAllWaterHistory(query: { zoneId: string; from: string; to: string; status: string }, signal: AbortSignal): Promise<WorkspaceResult<WaterHistoryData>> {
  const items: WaterRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (signal.aborted) return { status: "error", httpStatus: 0, uncertain: false };
    const result = await waterRepository.read("list", { ...query, status: query.status || "All", page: String(page), pageSize: String(PAGE) }, c.waterHistorySchema, signal);
    if (result.status !== "success") return result;
    items.push(...result.data.items);
    if (!result.data.items.length || items.length >= result.data.total) return { status: "success", data: { zoneId: query.zoneId, items, total: result.data.total, truncated: false } };
  }
  return { status: "success", data: { zoneId: query.zoneId, items, total: items.length, truncated: true } };
}

/** A measurement is "outside" when the backend flagged values beyond the thresholds it was recorded with. */
export const isOutside = (row: WaterRow) => row.valuesOutside.length > 0 || !!row.violatedValues;

export function filterWater(rows: readonly WaterRow[], filters: WaterFilters): WaterRow[] {
  const term = foldVietnamese(filters.search.trim());
  return rows.filter(row => (!filters.raftId || row.raftId === filters.raftId) && (!filters.exceeded || isOutside(row))
    && (!term || foldVietnamese(`${row.raftCode} ${row.measuredBy?.name ?? ""}`).includes(term)));
}

/** Distinct rafts of the loaded measurements, for the raft filter. */
export function raftsOf(rows: readonly WaterRow[]): [string, string][] {
  const found = new Map(rows.map(row => [row.raftId, row.raftCode] as const));
  return [...found].sort((a, b) => a[1].localeCompare(b[1], "vi", { numeric: true }));
}

const sortValue: Record<WaterSortKey, (row: WaterRow) => number | string> = {
  time: row => Date.parse(row.measuredAt), raft: row => row.raftCode, ph: row => row.ph, salinity: row => row.salinity, temperature: row => row.temperature,
  alert: row => Number(isOutside(row)), status: row => row.statusCode, by: row => row.measuredBy?.name ?? "",
};

export function sortWater(rows: readonly WaterRow[], key: WaterSortKey, direction: "asc" | "desc"): WaterRow[] {
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
