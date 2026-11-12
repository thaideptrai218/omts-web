import { isAllTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";

/** Bộ lọc của danh sách hóa đơn bán (SALE-09) và các phép tính thuần: quy ra tham số truy vấn của BFF. Kỳ xem do bộ lọc thời gian dùng chung giữ (`TimeRangeValue`). */
export type Picked = { id: string; title: string; sub?: string };
export type Filters = { zoneId: string; customer: Picked | null; lot: Picked | null; status: "" | "3501" | "3502"; paid: "" | "true" | "false"; cashMine: boolean };
export const emptyFilters: Filters = { zoneId: "", customer: null, lot: null, status: "", paid: "", cashMine: false };

/** Backend chỉ nhận một kỳ tối đa 5 năm: "Toàn thời gian" lấy 5 năm gần nhất (29/02 lùi về 28/02). */
const fiveYearsBefore = (today: string) => `${Number(today.slice(0, 4)) - 5}${today.slice(4).replace("-02-29", "-02-28")}`;

/** Lỗi kỳ xem (tiếng Việt) hoặc null nếu có thể xem; khớp kiểm tra kỳ của backend (từ <= đến, tối đa 5 năm). */
export function timeProblem(time: TimeRangeValue): string | null {
  if (isAllTime(time)) return null;
  if (!time.from || !time.to) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (time.from > time.to) return "Ngày bắt đầu không được sau ngày kết thúc.";
  const [year, month, day] = time.from.split("-").map(Number);
  if (time.to > new Date(Date.UTC(year + 5, month - 1, day)).toISOString().slice(0, 10)) return "Khoảng thời gian tối đa 5 năm.";
  return null;
}

/** Tham số truy vấn gửi BFF; ô tìm theo mã hóa đơn đi vào `code`. */
export function toQuery(input: { search: string; time: TimeRangeValue; filters: Filters }, today: string): Record<string, string | undefined> {
  const { search, time, filters: f } = input, all = isAllTime(time);
  return {
    from: all ? fiveYearsBefore(today) : time.from, to: all ? today : time.to, zoneId: f.zoneId || undefined, customerId: f.customer?.id, harvestLotId: f.lot?.id,
    statusId: f.status || undefined, paid: f.paid || undefined, code: search.trim() || undefined, cashCollectedByMe: f.cashMine ? "true" : undefined,
  };
}
