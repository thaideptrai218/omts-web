import { groupingValue, type Grouping, type YieldGroup } from "./contracts";

/** Logic thuần của màn Sản lượng nuôi: bộ lọc, sắp xếp, phân trang phía trình duyệt (backend trả toàn bộ nhóm của kỳ). */
export type Filters = { from: string; to: string; groupBy: Grouping; zoneIds: string[] };
export type SortKey = "label" | "lotCount" | "estimatedKg" | "soldKg" | "remainingKg";
export type Sort = { key: SortKey; dir: "asc" | "desc" };
export const pageSize = 20;
export const defaultSort: Sort = { key: "label", dir: "asc" };

const pad = (n: number) => String(n).padStart(2, "0");

/** Tháng của ngày `today` (yyyy-MM-dd): từ mùng 1 đến ngày cuối tháng, giống mặc định của backend. */
export function monthRange(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}
export const defaultFilters = (today: string): Filters => ({ ...monthRange(today), groupBy: "Raft", zoneIds: [] });

/** A record link must include historical harvests; omitted API dates otherwise mean the current month. */
export function linkedYieldFilters(today: string, linked: { zoneId?: string; cycleId?: string; recordId?: string; from?: string; to?: string }): Filters {
  const filters = defaultFilters(today);
  const validDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
  const from = validDate(linked.from), to = validDate(linked.to);
  if (linked.cycleId || linked.recordId || from || to) { filters.from = from ?? "0001-01-01"; filters.to = to ?? today; }
  if (linked.zoneId) filters.zoneIds = [linked.zoneId];
  return filters;
}

/** Lỗi nhập bộ lọc để chặn gọi API; null nếu hợp lệ. */
export function filterProblem(f: Filters): string | null {
  if (!f.from || !f.to) return "Hãy chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (f.from > f.to) return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  return null;
}

/** Truy vấn gửi BFF; chọn hết hoặc không chọn vùng nào đều nghĩa là mọi vùng được phép xem. */
export function toQuery(f: Filters, allZoneCount: number): Record<string, string | undefined> {
  const all = !f.zoneIds.length || allZoneCount > 0 && f.zoneIds.length >= allZoneCount;
  return { from: f.from, to: f.to, groupBy: groupingValue(f.groupBy), zoneIds: all ? undefined : f.zoneIds.join(",") };
}

export function sortGroups(groups: readonly YieldGroup[], sort: Sort): YieldGroup[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...groups].sort((a, b) => sign * (sort.key === "label" ? a.label.localeCompare(b.label, "vi", { numeric: true }) : (a[sort.key] ?? 0) - (b[sort.key] ?? 0)));
}
export const nextSort = (current: Sort, key: SortKey): Sort => current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "label" ? "asc" : "desc" };

export const pageSlice = <T,>(rows: readonly T[], page: number) => rows.slice((page - 1) * pageSize, page * pageSize);

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
export const formatKg = (value: number) => number.format(value);

/** Phần trăm đạt so với kg mục tiêu của chu kỳ; undefined khi chưa có mục tiêu (không hiển thị thanh). */
export function percentOfTarget(harvestedKg: number, targetKg?: number | null): number | undefined {
  return targetKg && targetKg > 0 ? Math.round((harvestedKg / targetKg) * 100) : undefined;
}
