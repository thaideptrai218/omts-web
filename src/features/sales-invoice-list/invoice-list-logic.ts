import { fromQueryDate, isAllTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";

/** Bộ lọc của danh sách hóa đơn bán (SALE-09) và các phép tính thuần: quy ra tham số truy vấn của BFF. Kỳ xem do bộ lọc thời gian dùng chung giữ (`TimeRangeValue`). */
export type Picked = { id: string; title: string; sub?: string };
export type Filters = { customer: Picked | null; lot: Picked | null; status: "" | "3501" | "3502"; paid: "" | "true" | "false"; cashMine: boolean };
export const emptyFilters: Filters = { customer: null, lot: null, status: "", paid: "", cashMine: false };

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

/** Khoảng ngày gửi BFF, tính từ ngày hôm nay theo giờ Việt Nam (không theo múi giờ trình duyệt): mốc nhanh tính lại từ `today`, "Toàn thời gian" thành 5 năm gần nhất, khoảng tùy chỉnh giữ đúng ngày đã chọn. */
export function periodRange(time: TimeRangeValue, today: string): { from: string; to: string } {
  if (isAllTime(time)) return { from: fiveYearsBefore(today), to: today };
  if (time.kind === "preset") { const { from, to } = presetValue(time.preset, fromQueryDate(today)); return { from, to }; }
  return { from: time.from, to: time.to };
}

/** Tham số truy vấn gửi BFF; ô tìm theo mã hóa đơn đi vào `code`; `zoneIds` là các vùng đang chọn ở thanh trên (rỗng = mọi vùng được xem). */
export function toQuery(input: { search: string; time: TimeRangeValue; filters: Filters; zoneIds?: string }, today: string): Record<string, string | undefined> {
  const { search, time, filters: f } = input, { from, to } = periodRange(time, today);
  return {
    from, to, zoneIds: input.zoneIds || undefined, customerId: f.customer?.id, harvestLotId: f.lot?.id,
    statusId: f.status || undefined, paid: f.paid || undefined, code: search.trim() || undefined, cashCollectedByMe: f.cashMine ? "true" : undefined,
  };
}
