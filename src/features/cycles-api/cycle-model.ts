import type { z } from "zod";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { cycleView, zoneCycles } from "./contracts";

export type CycleRow = z.infer<typeof zoneCycles>[number];
export type CycleView = z.infer<typeof cycleView>;
export type CycleState = "open" | "closed" | "none";
export const cycleStateOf = (row: CycleRow): CycleState => row.cycle ? row.cycle.closeDate ? "closed" : "open" : "none";
export const cycleStateLabel = (state: CycleState) => ({ open: "Đang mở", closed: "Đã đóng", none: "Chưa có chu kỳ" })[state];
export const raftStatusLabel = (statusId: number) => statusId === 101 ? "Đang sử dụng" : "Ngừng sử dụng";
/** A cycle can be started by hand on a raft in use that has no open cycle (the backend `canStart` already says so; the checks keep a stale row from showing the button). */
export const canStartCycle = (row: CycleRow) => row.canStart && row.raftStatusId === 101 && !(row.cycle && !row.cycle.closeDate);

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

/** The nursed batch of a cycle can change only while no lane was seeded (409 CYCLE_SEED_LOCKED otherwise). Any seed already hung, a finished seeding or a lane that is not "NotSeeded" locks it. */
export function isNurseryBatchLocked(cycle: Pick<CycleView, "nurserySeeded" | "seedingCompletedOn" | "canChangeNursery">, lanes: readonly { state: string; statusId?: number }[] = []): boolean {
  return cycle.canChangeNursery === false || (cycle.nurserySeeded ?? 0) > 0 || !!cycle.seedingCompletedOn || lanes.some(lane => lane.statusId !== 2002 && lane.state !== "NotSeeded");
}

/** The backend refused a nursed-batch change because a lane was seeded meanwhile (409 CYCLE_SEED_LOCKED). */
export const seedLockedFailure = (failure: { code?: string; problem?: { code?: string; reasonCode?: string } } | undefined) =>
  !!failure && [failure.code, failure.problem?.code, failure.problem?.reasonCode].some(code => code?.includes("CYCLE_SEED_LOCKED"));

/** The backend refused a nursed batch whose seed item has no loại hàu (400/409 SEED_ITEM_WITHOUT_PRODUCT): its own Vietnamese detail, else the fixed sentence. */
export function seedWithoutProductText(failure: { code?: string; problem?: { code?: string; reasonCode?: string; hint?: string; message?: string; detail?: string } } | undefined): string | undefined {
  if (![failure?.code, failure?.problem?.code, failure?.problem?.reasonCode].some(code => code === "SEED_ITEM_WITHOUT_PRODUCT")) return undefined;
  const own = [failure?.problem?.hint, failure?.problem?.detail, failure?.problem?.message].find(text => text && /[À-ỹ]/.test(text));
  return own ?? "Giống của đợt ươm này chưa gắn loại hàu bán ra. Hãy chọn loại hàu cho giống trong Vật tư & Giống.";
}

export type PlanDraft = Record<"startDate" | "targetYieldKg" | "note" | "nurseryBatchId", string>;
export type PlanField = keyof PlanDraft;
export const planDraftOf = (cycle: CycleView): PlanDraft => ({ startDate: cycle.startDate, targetYieldKg: cycle.targetYieldKg === null ? "" : String(cycle.targetYieldKg), note: cycle.note ?? "", nurseryBatchId: cycle.nurseryBatchId ?? "" });
/** Planned total yield (kg): above 0; blank only where the cycle has none yet (an old cycle without a nursery batch). */
export function validateTargetYield(text: string, required: boolean): string | undefined {
  if (text.trim() === "") return required ? "Nhập sản lượng dự kiến lớn hơn 0." : undefined;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? undefined : "Nhập sản lượng dự kiến lớn hơn 0.";
}
/** Start date is required and not after today; the yield is required for a cycle that has a nursery batch. */
export function validatePlan(draft: PlanDraft, today: string): Partial<Record<PlanField, string>> {
  const errors: Partial<Record<PlanField, string>> = {};
  if (!draft.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  else if (draft.startDate > today) errors.startDate = "Ngày bắt đầu không được sau hôm nay.";
  const yieldError = validateTargetYield(draft.targetYieldKg, !!draft.nurseryBatchId);
  if (yieldError) errors.targetYieldKg = yieldError;
  return errors;
}
/**
 * Body of the edit: `nurseryBatchId` is sent only when it really changed and the cycle is not locked by a seeding (the backend then re-derives the loại hàu from
 * the new batch; the body never carries a product); an empty note ("") clears it, a null yield keeps the old one.
 */
export function planBody(draft: PlanDraft, cycle: Pick<CycleView, "rowVersion" | "nurseryBatchId">, batchLocked: boolean) {
  const number = (value: string) => value === "" ? null : Number(value.replace(",", "."));
  const changedBatch = !batchLocked && !!draft.nurseryBatchId && draft.nurseryBatchId !== (cycle.nurseryBatchId ?? "");
  return { startDate: draft.startDate || null, targetYieldKg: number(draft.targetYieldKg), note: draft.note.trim(), ...(changedBatch ? { nurseryBatchId: draft.nurseryBatchId } : {}), rowVersion: cycle.rowVersion };
}
