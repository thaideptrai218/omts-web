import type { YieldGroup } from "./contracts";
import { daysBetween, filterCycleGroups, kgPerCageOf, percentOfTarget, regroup, sumNullable, type YieldRow } from "./yield-rows";

/** Số liệu tóm tắt của một tập nhóm theo chu kỳ (đã lọc). Thiếu dữ liệu là null, không bù bằng 0. */
export type Kpis = {
  lots: number; cages: number | null; kg: number; soldKg: number; remainingKg: number | null;
  /** Kg ước tính trung bình mỗi lồng; chỉ tính trên các nhóm có số lồng. */
  kgPerCage: number | null; rafts: number;
  /** Phần trăm so với mục tiêu, chỉ trên các chu kỳ có đặt mục tiêu. */
  targetPct: number | null; targetCycles: number;
};

export function kpisOf(groups: readonly YieldGroup[]): Kpis {
  const withCages = groups.filter((group) => (group.harvestedCages ?? 0) > 0);
  const withTarget = groups.filter((group) => (group.targetYieldKg ?? 0) > 0);
  const cagesKg = withCages.reduce((sum, group) => sum + group.estimatedKg, 0), cages = sumNullable(groups.map((group) => group.harvestedCages));
  const targetKg = withTarget.reduce((sum, group) => sum + (group.targetYieldKg ?? 0), 0);
  return {
    lots: groups.reduce((sum, group) => sum + group.lotCount, 0), cages, kg: groups.reduce((sum, group) => sum + group.estimatedKg, 0),
    soldKg: groups.reduce((sum, group) => sum + group.soldKg, 0), remainingKg: sumNullable(groups.map((group) => group.availableKg)),
    kgPerCage: withCages.length ? cagesKg / withCages.reduce((sum, group) => sum + (group.harvestedCages ?? 0), 0) : null,
    rafts: new Set(groups.filter((group) => group.lotCount > 0).map((group) => group.raftId ?? group.key)).size,
    targetPct: withTarget.length ? percentOfTarget(withTarget.reduce((sum, group) => sum + group.estimatedKg, 0), targetKg) ?? null : null, targetCycles: withTarget.length,
  };
}

/** Thay đổi phần trăm so với kỳ trước; null khi kỳ trước không có số liệu để so (không chia cho 0). */
export function deltaPercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const allTimeFrom = "0001-01-01";
/** Kỳ liền trước dài bằng kỳ đang xem; null với "Toàn thời gian" hoặc kỳ quá dài so với giới hạn 5 năm của backend. */
export function previousRange(from: string, to: string): { from: string; to: string } | null {
  if (from === allTimeFrom || from > to || daysBetween(from, to) + 1 > 1826) return null;
  const length = daysBetween(from, to) + 1;
  if (length > 1826) return null;
  const prevTo = Date.parse(from) - 86_400_000;
  return { from: ymd(prevTo - (length - 1) * 86_400_000), to: ymd(prevTo) };
}

export type Ranked = { key: string; label: string; value: number; raftId: string | null; zoneId: string };
const ranked = (rows: readonly YieldRow[], value: (row: YieldRow) => number | null): Ranked[] => rows
  .map((row) => ({ key: row.key, label: row.label, value: value(row), raftId: row.raftId, zoneId: row.zoneId }))
  .filter((row): row is Ranked => row.value != null && row.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);

export type ClosedCycle = { key: string; label: string; zoneId: string; raftId: string | null; cycleId: string | null; estimatedKg: number; targetKg: number | null; targetPct: number | null; days: number | null };

/** Thẻ gợi ý: chỉ tính từ dữ liệu báo cáo; bè chưa thu cần danh sách bè đang dùng (có thể chưa tải xong). */
export function insightsOf(groups: readonly YieldGroup[], allRafts: readonly { id: string; code: string }[] | undefined) {
  const rafts = regroup(groups, "Raft");
  const harvested = new Set(groups.filter((group) => group.lotCount > 0).map((group) => group.raftId));
  const closed: ClosedCycle[] = filterCycleGroups(groups, { raftId: "", statuses: ["closed"] })
    .sort((a, b) => (b.cycleCloseDate ?? "").localeCompare(a.cycleCloseDate ?? "")).slice(0, 3).map((group) => ({
      key: group.key, label: group.raftCode ? `Bè ${group.raftCode}` : group.label, zoneId: group.zoneId, raftId: group.raftId, cycleId: group.cycleId, estimatedKg: group.estimatedKg,
      targetKg: (group.targetYieldKg ?? 0) > 0 ? group.targetYieldKg ?? null : null, targetPct: percentOfTarget(group.estimatedKg, group.targetYieldKg) ?? null,
      days: group.cycleStartDate && group.cycleCloseDate ? Math.max(0, daysBetween(group.cycleStartDate, group.cycleCloseDate)) : null,
    }));
  return {
    topByKg: ranked(rafts, (row) => row.estimatedKg), topByKgPerCage: ranked(rafts, kgPerCageOf), closed,
    notHarvested: allRafts ? allRafts.filter((raft) => !harvested.has(raft.id)) : undefined,
  };
}
