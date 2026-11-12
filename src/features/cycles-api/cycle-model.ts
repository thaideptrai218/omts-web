import type { z } from "zod";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { cycleView, zoneCycles } from "./contracts";

export type CycleRow = z.infer<typeof zoneCycles>[number];
export type CycleView = z.infer<typeof cycleView>;
export type CycleState = "open" | "closed" | "none";
export const cycleStateOf = (row: CycleRow): CycleState => row.cycle ? row.cycle.closeDate ? "closed" : "open" : "none";
export const cycleStateLabel = (state: CycleState) => ({ open: "Đang mở", closed: "Đã đóng", none: "Chưa có chu kỳ" })[state];
export const raftStatusLabel = (statusId: number) => statusId === 101 ? "Đang sử dụng" : "Ngừng sử dụng";

export type CycleSortKey = "raft" | "raftStatus" | "state" | "start" | "close";
export type CycleFilters = { search: string; state: string; raftStatus: string };
export const emptyCycleFilters: CycleFilters = { search: "", state: "", raftStatus: "" };
export function filterCycleRows(rows: readonly CycleRow[], filters: CycleFilters): CycleRow[] {
  const term = foldVietnamese(filters.search.trim());
  return rows.filter(row => (!filters.state || cycleStateOf(row) === filters.state) && (!filters.raftStatus || String(row.raftStatusId) === filters.raftStatus) && (!term || foldVietnamese(row.raftCode).includes(term)));
}
const sortValue = (row: CycleRow, key: CycleSortKey) => key === "raft" ? row.raftCode : key === "raftStatus" ? String(row.raftStatusId) : key === "state" ? cycleStateOf(row)
  : key === "start" ? row.cycle?.startDate ?? "" : row.cycle?.closeDate ?? "";
export function sortCycleRows(rows: readonly CycleRow[], key: CycleSortKey, direction: "asc" | "desc"): CycleRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * (sortValue(a, key).localeCompare(sortValue(b, key), "vi", { numeric: true }) || a.raftCode.localeCompare(b.raftCode, "vi", { numeric: true })));
}

export type PlanDraft = Record<"startDate" | "expectedSeedQuantity" | "targetYieldKg", string>;
export type PlanField = keyof PlanDraft;
const asText = (value: string | number | null) => value === null ? "" : String(value);
export const planDraftOf = (cycle: CycleView): PlanDraft => ({ startDate: cycle.startDate, expectedSeedQuantity: asText(cycle.expectedSeedQuantity), targetYieldKg: asText(cycle.targetYieldKg) });
/** Start date is required; planned quantities are optional but must be positive numbers when given. */
export function validatePlan(draft: PlanDraft, today: string): Partial<Record<PlanField, string>> {
  const errors: Partial<Record<PlanField, string>> = {};
  if (!draft.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  else if (draft.startDate > today) errors.startDate = "Ngày bắt đầu không được sau hôm nay.";
  for (const key of ["expectedSeedQuantity", "targetYieldKg"] as const) {
    if (draft[key] === "") continue;
    const value = Number(draft[key].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) errors[key] = "Nhập số lớn hơn 0.";
  }
  return errors;
}
export function planBody(draft: PlanDraft, rowVersion: string) {
  const number = (value: string) => value === "" ? null : Number(value.replace(",", "."));
  return { startDate: draft.startDate || null, expectedSeedQuantity: number(draft.expectedSeedQuantity), targetYieldKg: number(draft.targetYieldKg), rowVersion };
}
