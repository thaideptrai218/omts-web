import { boundedRange, timeRangeKey } from "@/components/ui/management-screen/time-range-limits";
import { fromQueryDate, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { PickedCustomer } from "@/features/customer-lookup/customer-search";

/** Bộ lọc của danh sách hóa đơn bán (SALE-09 bước 2-3) và các phép tính thuần: ngày theo giờ Việt Nam, quy ra tham số truy vấn của BFF. */
export type LotFilter = { id: string; lotCode: string };
export type Filters = {
  time: TimeRangeValue; zoneId: string; customer: PickedCustomer | null; lot: LotFilter | null;
  completed: boolean; cancelled: boolean; paid: "" | "true" | "false"; code: string; cashMine: boolean;
};
export const pageSize = 20;
/** Backend chỉ nhận kỳ xem tối đa 5 năm (từ <= đến). */
export const MAX_PERIOD_YEARS = 5;

export const defaultFilters = (): Filters => ({ time: presetValue("today"), zoneId: "", customer: null, lot: null, completed: true, cancelled: true, paid: "", code: "", cashMine: false });

/**
 * Khoảng ngày gửi BFF, tính từ ngày hôm nay theo giờ Việt Nam (không theo múi giờ trình duyệt): mốc nhanh tính lại từ `today`,
 * "Toàn thời gian" thành 5 năm gần nhất (kỳ rộng nhất backend cho phép), khoảng tùy chỉnh giữ đúng ngày đã chọn.
 */
export function periodRange(time: TimeRangeValue, today: string): { from: string; to: string } {
  if (time.kind === "preset" && time.preset !== "all") { const { from, to } = presetValue(time.preset, fromQueryDate(today)); return { from, to }; }
  return boundedRange(time, today, MAX_PERIOD_YEARS);
}

/** Lỗi bộ lọc đầu tiên (tiếng Việt) hoặc null nếu có thể xem; khớp kiểm tra kỳ của backend (từ <= đến, tối đa 5 năm). */
export function filterProblem(f: Filters): string | null {
  if (f.time.kind !== "custom") return null;
  const { from, to } = f.time;
  if (!from || !to) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (from > to) return "Ngày bắt đầu không được sau ngày kết thúc.";
  const [y, m, d] = from.split("-").map(Number);
  if (to > new Date(Date.UTC(y + MAX_PERIOD_YEARS, m - 1, d)).toISOString().slice(0, 10)) return "Khoảng thời gian tối đa 5 năm.";
  return null;
}

/** Tham số truy vấn gửi BFF. Cả hai trạng thái được chọn (hoặc cả hai bỏ chọn) nghĩa là không lọc theo trạng thái. */
export function toQuery(f: Filters, today: string): Record<string, string | undefined> {
  const { from, to } = periodRange(f.time, today);
  const oneStatus = f.completed !== f.cancelled;
  return {
    from, to, zoneId: f.zoneId || undefined, customerId: f.customer?.id, harvestLotId: f.lot?.id, statusId: oneStatus ? (f.completed ? "3501" : "3502") : undefined,
    paid: f.paid || undefined, code: f.code.trim() || undefined, cashCollectedByMe: f.cashMine ? "true" : undefined,
  };
}

/** Bộ lọc nào đang khác mặc định, để hiển thị "Đặt lại" và thông báo rỗng đúng ngữ cảnh. Mốc nhanh so theo tên mốc, không theo ngày đã tính. */
export const isDefault = (f: Filters) => {
  const fresh = defaultFilters();
  return JSON.stringify({ ...f, time: timeRangeKey(f.time) }) === JSON.stringify({ ...fresh, time: timeRangeKey(fresh.time) });
};
