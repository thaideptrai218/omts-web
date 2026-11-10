import { REQUEST_STATUS_IDS, type TraderRequest } from "./contracts";

/** Logic thuần của "Đơn mua của tôi": nhãn trạng thái, lọc, định dạng kg/ngày, đọc số kg người dùng nhập. */
export type RequestStatusKey = "awaiting" | "accepted" | "fulfilled" | "declined" | "cancelled";
export type StatusTone = "wait" | "good" | "done" | "bad" | "muted";

export const STATUS_PRESENTATION: Record<RequestStatusKey, { label: string; icon: string; tone: StatusTone }> = {
  awaiting: { label: "Chờ phản hồi", icon: "…", tone: "wait" },
  accepted: { label: "Đã chấp nhận", icon: "✓", tone: "good" },
  fulfilled: { label: "Đã hoàn thành", icon: "✓✓", tone: "done" },
  declined: { label: "Bị từ chối", icon: "✕", tone: "bad" },
  cancelled: { label: "Đã hủy", icon: "⊘", tone: "muted" },
};
export const STATUS_ORDER: readonly RequestStatusKey[] = ["awaiting", "accepted", "fulfilled", "declined", "cancelled"];

/** "Fulfilled" là cờ tính từ hóa đơn; StatusId vẫn là Accepted (3202). Trạng thái lạ rơi về "Chờ phản hồi" thay vì ẩn đơn. */
export function statusKey(request: Pick<TraderRequest, "statusId" | "fulfilled">): RequestStatusKey {
  if (request.fulfilled) return "fulfilled";
  if (request.statusId === REQUEST_STATUS_IDS.accepted) return "accepted";
  if (request.statusId === REQUEST_STATUS_IDS.declined) return "declined";
  if (request.statusId === REQUEST_STATUS_IDS.cancelled) return "cancelled";
  return "awaiting";
}

/** Backend không lọc trạng thái, nên lọc trong trang đã tải. Rỗng = tất cả. */
export function filterByStatus(requests: readonly TraderRequest[], wanted: ReadonlySet<RequestStatusKey>) {
  return wanted.size ? requests.filter((request) => wanted.has(statusKey(request))) : requests;
}

export function countByStatus(requests: readonly TraderRequest[]) {
  const counts: Record<RequestStatusKey, number> = { awaiting: 0, accepted: 0, fulfilled: 0, declined: 0, cancelled: 0 };
  for (const request of requests) counts[statusKey(request)] += 1;
  return counts;
}

export const formatKg = (kg: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(kg)} kg`;
export const formatDate = (iso: string) => iso.split("-").reverse().join("/");
export const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

/** Số kg người dùng nhập ("1,5" hoặc "1.5") -> số; undefined nếu không phải số dương tối đa 3 chữ số thập phân. */
export function parseKgInput(text: string): number | undefined {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,15}(\.\d{1,3})?$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return value > 0 ? value : undefined;
}

/** Tóm tắt phản hồi của Chủ HTX cho một dòng danh sách; hàng 2 là ghi chú/lý do. */
export function responseSummary(request: TraderRequest): { headline: string; note: string | null } {
  const key = statusKey(request), response = request.response;
  if (key === "cancelled") return { headline: "Bạn đã hủy yêu cầu", note: request.cancelReason };
  if (!response) return { headline: "Chưa có phản hồi", note: null };
  if (key === "declined" || response.acceptedKg === null) return { headline: "Hợp tác xã từ chối", note: response.note };
  const parts = [formatKg(response.acceptedKg)];
  if (response.pickupDate) parts.push(`lấy ngày ${formatDate(response.pickupDate)}`);
  parts.push(response.payLaterAgreed ? "cho trả sau" : "không trả sau");
  return { headline: parts.join(" · "), note: response.note };
}
