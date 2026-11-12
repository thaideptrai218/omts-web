import type { YieldGroup, ViewGrouping } from "./contracts";

/**
 * Hàng của bảng Sản lượng nuôi: gộp ở trình duyệt từ các nhóm theo chu kỳ (mức nhỏ nhất backend trả), nên đổi cách gộp, lọc bè
 * và lọc trạng thái không phải gọi lại API. Mọi số đều lấy từ dữ liệu thật; thiếu thì là null, không bù bằng 0 hay ước lượng.
 */
export type YieldRow = YieldGroup & {
  /** Kg ước tính của riêng các chu kỳ có mục tiêu: mẫu số đúng để so với targetYieldKg khi gộp nhiều chu kỳ. */
  targetedKg?: number;
};
export type StatusKey = "open" | "closed" | "notFinal";
export const statusLabel: Record<StatusKey, string> = { open: "Đang mở", closed: "Đã đóng", notFinal: "Chưa chốt" };
export type SortKey = "label" | "lotCount" | "cages" | "estimatedKg" | "kgPerCage" | "targetPct" | "soldKg" | "remainingKg" | "lastHarvest" | "daysToLast";

/** Tổng cho phép thiếu: toàn bộ thiếu thì kết quả thiếu (null), không phải 0. */
export function sumNullable(values: readonly (number | null | undefined)[]): number | null {
  const present = values.filter((value): value is number => value != null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null;
}

/** Phần trăm đạt so với kg mục tiêu của chu kỳ; undefined khi chưa có mục tiêu (không hiển thị thanh). */
export function percentOfTarget(harvestedKg: number, targetKg?: number | null): number | undefined {
  return targetKg && targetKg > 0 ? Math.round((harvestedKg / targetKg) * 100) : undefined;
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export const lastHarvestOf = (row: YieldGroup): string | null => row.lots.reduce<string | null>((latest, lot) => !latest || lot.harvestDate > latest ? lot.harvestDate : latest, null);
export const cagesOf = (row: YieldGroup) => row.harvestedCages ?? null;
export const kgPerCageOf = (row: YieldGroup) => { const cages = cagesOf(row); return cages && cages > 0 ? row.estimatedKg / cages : null; };
export const targetPctOf = (row: YieldRow) => percentOfTarget(row.targetedKg ?? row.estimatedKg, row.targetYieldKg) ?? null;
/** Số ngày từ lần thả đến lần thu cuối; chỉ tính được khi biết ngày bắt đầu chu kỳ (gộp nhiều chu kỳ thì không có). */
export const daysToLastOf = (row: YieldGroup) => { const last = lastHarvestOf(row); return row.cycleStartDate && last ? Math.max(0, daysBetween(row.cycleStartDate, last)) : null; };

export function metricOf(row: YieldRow, key: Exclude<SortKey, "label">): number | string | null {
  switch (key) {
    case "lotCount": return row.lotCount;
    case "cages": return cagesOf(row);
    case "estimatedKg": return row.estimatedKg;
    case "kgPerCage": return kgPerCageOf(row);
    case "targetPct": return targetPctOf(row);
    case "soldKg": return row.soldKg;
    case "remainingKg": return row.availableKg ?? null;
    case "lastHarvest": return lastHarvestOf(row);
    case "daysToLast": return daysToLastOf(row);
  }
}

/** Trạng thái số liệu của hàng: chu kỳ đang mở/đã đóng (nếu biết) và có lô chưa chốt hay không. */
export function statusKeysOf(row: YieldGroup): StatusKey[] {
  const keys: StatusKey[] = [];
  if (row.cycleStatus === "Open") keys.push("open");
  if (row.cycleStatus === "Closed") keys.push("closed");
  if (row.notFinal) keys.push("notFinal");
  return keys;
}

export type RowScope = { raftId: string; statuses: readonly StatusKey[] };
/** Lọc nhóm theo chu kỳ: bè (theo id) và trạng thái (chọn nhiều là "hoặc"; không chọn là tất cả). */
export function filterCycleGroups(groups: readonly YieldGroup[], scope: RowScope): YieldGroup[] {
  return groups.filter((group) => (!scope.raftId || group.raftId === scope.raftId)
    && (!scope.statuses.length || statusKeysOf(group).some((key) => scope.statuses.includes(key))));
}

/** Liên kết sâu từ màn khác (?raftId, ?cycleId, ?recordId): thu hẹp về đúng bè/chu kỳ/lô được nhắc tới. */
export type LinkedScope = { raftId?: string; cycleId?: string; recordId?: string };
export const matchesLinked = (group: YieldGroup, linked: LinkedScope) => (!linked.raftId || group.raftId === linked.raftId) && (!linked.cycleId || group.cycleId === linked.cycleId)
  && (!linked.recordId || [group.key, group.raftId, group.cycleId, group.zoneId].includes(linked.recordId) || group.lots.some((lot) => lot.id === linked.recordId));

const monthLabel = (key: string) => `Tháng ${key.slice(5)}/${key.slice(0, 4)}`;
const total = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);
const byDateDesc = (a: { harvestDate: string }, b: { harvestDate: string }) => b.harvestDate.localeCompare(a.harvestDate);

function groupParts<T>(items: readonly T[], keyOf: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) { const key = keyOf(item); map.set(key, [...(map.get(key) ?? []), item]); }
  return map;
}

function merge(key: string, label: string, parts: readonly YieldGroup[], keep: Partial<Pick<YieldGroup, "raftId" | "raftCode">>): YieldRow {
  const first = parts[0], single = parts.length === 1;
  const withTarget = parts.filter((part) => (part.targetYieldKg ?? 0) > 0);
  const statuses = new Set(parts.map((part) => part.cycleStatus));
  return {
    ...first, key, label, ...keep,
    cycleId: single ? first.cycleId : null, cycleStartDate: single ? first.cycleStartDate : null, cycleCloseDate: single ? first.cycleCloseDate : null,
    cycleStatus: statuses.has("Open") ? "Open" : statuses.size === 1 ? first.cycleStatus : null,
    lotCount: total(parts.map((part) => part.lotCount)), estimatedKg: total(parts.map((part) => part.estimatedKg)),
    soldKg: total(parts.map((part) => part.soldKg)), lostKg: total(parts.map((part) => part.lostKg)),
    differenceKg: total(parts.map((part) => part.differenceKg)), notFinal: parts.some((part) => part.notFinal),
    harvestedCages: sumNullable(parts.map((part) => part.harvestedCages)),
    targetYieldKg: sumNullable(withTarget.map((part) => part.targetYieldKg)), targetedKg: total(withTarget.map((part) => part.estimatedKg)),
    remainingKg: sumNullable(parts.map((part) => part.remainingKg)), availableKg: sumNullable(parts.map((part) => part.availableKg)),
    lots: parts.flatMap((part) => part.lots).sort(byDateDesc),
  };
}

function monthRow(month: string, lots: YieldGroup["lots"]): YieldRow {
  return {
    key: month, label: monthLabel(month), zoneId: "", zoneCode: "", zoneName: "", raftId: null, raftCode: null, cycleId: null, cycleStartDate: null, cycleCloseDate: null, cycleStatus: null,
    lotCount: lots.length, estimatedKg: total(lots.map((lot) => lot.estimatedKg)), soldKg: total(lots.map((lot) => lot.soldKg)),
    lostKg: total(lots.map((lot) => lot.lostKg)), differenceKg: total(lots.map((lot) => lot.differenceKg)), notFinal: lots.some((lot) => lot.notFinal),
    harvestedCages: sumNullable(lots.map((lot) => lot.cageCount)), availableKg: sumNullable(lots.map((lot) => lot.remainingKg)), lots: [...lots].sort(byDateDesc),
  };
}

/** Gộp các nhóm theo chu kỳ thành hàng của cách gộp đang chọn. "Tháng" gộp theo ngày thu hoạch từng lô trong kỳ. */
export function regroup(cycleGroups: readonly YieldGroup[], mode: ViewGrouping): YieldRow[] {
  if (mode === "Cycle") return cycleGroups.map((group) => ({ ...group, label: group.raftCode ? `Bè ${group.raftCode}` : group.label }));
  if (mode === "Raft") return [...groupParts(cycleGroups, (group) => group.raftId ?? group.key)].map(([key, parts]) => merge(key, parts[0].raftCode ? `Bè ${parts[0].raftCode}` : parts[0].label, parts, {}));
  if (mode === "Zone") return [...groupParts(cycleGroups, (group) => group.zoneId)].map(([key, parts]) => merge(key, parts[0].zoneName || parts[0].zoneCode, parts, { raftId: null, raftCode: null }));
  const lots = cycleGroups.flatMap((group) => group.lots.filter((lot) => lot.inPeriod));
  return [...groupParts(lots, (lot) => lot.harvestDate.slice(0, 7))].sort(([a], [b]) => b.localeCompare(a)).map(([month, monthLots]) => monthRow(month, monthLots));
}

/** Sắp xếp; ô thiếu số liệu luôn xuống cuối dù tăng hay giảm. */
export function sortRows(rows: readonly YieldRow[], key: SortKey, dir: "asc" | "desc"): YieldRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "label") return sign * a.label.localeCompare(b.label, "vi", { numeric: true });
    const x = metricOf(a, key), y = metricOf(b, key);
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;
    return sign * (typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y));
  });
}
