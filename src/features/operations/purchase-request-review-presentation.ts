import { REQUEST_STATUS_IDS } from "@/features/trader-purchases/contracts";
import { formatDate, formatKg, parseKgInput } from "@/features/trader-purchases/presentation";
import { approxCagesLabel } from "@/shared/format/cage-quantity";
import { acceptRequestSchema, declineRequestSchema, requestSendingSchema, type PurchaseRequest } from "./new-module-contracts";
import type { z } from "zod";

/** Logic thuần của màn duyệt "Yêu cầu mua hàu" (Chủ HTX / quản lý vùng, SCR-SALE-02), khớp PurchaseRequestsController. */
export type ReviewSending = z.infer<typeof requestSendingSchema>;
export type ReviewResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Mã trạng thái gửi lên `statusId`; "Hoàn thành" không có mã riêng (cờ fulfilled của đơn đã chấp nhận). */
export const REVIEW_STATUS_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  [String(REQUEST_STATUS_IDS.awaiting), "Chờ phản hồi"], [String(REQUEST_STATUS_IDS.accepted), "Đã chấp nhận"],
  [String(REQUEST_STATUS_IDS.declined), "Bị từ chối"], [String(REQUEST_STATUS_IDS.cancelled), "Đã hủy"],
];

/** BR-SALE-02: chỉ trả lời một lần, khi đơn còn "Chờ phản hồi". */
export const canRespondToRequest = (request: Pick<PurchaseRequest, "statusId">) => request.statusId === REQUEST_STATUS_IDS.awaiting;

const CHANNEL_LABELS: Record<string, string> = { Sms: "SMS", ZaloOa: "Zalo OA", Zalo: "Zalo OA", InApp: "Trong ứng dụng" };
const DELIVERY_LABELS: Record<number, string> = { 1601: "Đang gửi", 1602: "Đã gửi", 1603: "Gửi chưa thành công" };

/** Một dòng gửi tin phản hồi tới thương lái: kênh, số điện thoại và trạng thái chuyển phát (BR-SALE-09). */
export function sendingSummary(sending: ReviewSending): { channel: string; status: string; failed: boolean } {
  const id = sending.deliveryStatusId;
  return {
    channel: `${CHANNEL_LABELS[sending.channel] ?? sending.channel}${sending.phoneNumber ? ` · ${sending.phoneNumber}` : ""}`,
    status: id === null ? "Chưa có trạng thái" : DELIVERY_LABELS[id] ?? sending.deliveryStatus ?? "Không rõ",
    failed: id === 1603,
  };
}

/**
 * Số lượng theo kg (API chỉ trả kg) kèm quy đổi gần đúng ra lồng khi biết kg/lồng trung bình của HTX:
 * "≈ 3,6 lồng · 180 kg"; không có tỷ lệ thì chỉ "180 kg".
 */
export function quantityWithCages(kg: number, kgPerCage?: number): string {
  const approx = approxCagesLabel(kg, kgPerCage);
  return approx ? `${approx} · ${formatKg(kg)}` : formatKg(kg);
}

/** Tóm tắt phản hồi của Chủ HTX cho một dòng danh sách (kg chấp nhận, ngày lấy, trả sau hoặc lý do từ chối/hủy). */
export function reviewResponseSummary(request: PurchaseRequest, kgPerCage?: number): { headline: string; note: string | null } {
  const response = request.response;
  if (request.statusId === REQUEST_STATUS_IDS.cancelled) return { headline: "Thương lái đã hủy", note: request.cancelReason };
  if (!response) return { headline: "Chưa có phản hồi", note: null };
  if (response.acceptedKg === null) return { headline: "Đã từ chối", note: response.note };
  const parts = [quantityWithCages(response.acceptedKg, kgPerCage)];
  if (response.pickupDate) parts.push(`lấy ngày ${formatDate(response.pickupDate)}`);
  parts.push(response.payLaterAgreed ? "cho trả sau" : "không trả sau");
  return { headline: parts.join(" · "), note: response.note };
}

export type AcceptForm = { kg: string; pickupDate: string; payLater: boolean; note: string };
const trimmed = (text: string) => text.trim() || null;

/** Kiểm tra form chấp nhận (SALE-03.0): kg > 0, tối đa 3 số lẻ, không vượt kg yêu cầu; ngày lấy không trước hôm nay. */
export function buildAcceptPayload(form: AcceptForm, request: Pick<PurchaseRequest, "requestedKg" | "rowVersion">, today: string): ReviewResult<z.infer<typeof acceptRequestSchema>> {
  const kg = parseKgInput(form.kg);
  if (kg === undefined) return { ok: false, error: "Nhập số kg chấp nhận lớn hơn 0, tối đa 3 chữ số thập phân." };
  if (kg > request.requestedKg) return { ok: false, error: `Số kg chấp nhận không được vượt quá ${formatKg(request.requestedKg)} thương lái đã yêu cầu.` };
  if (!form.pickupDate || form.pickupDate < today) return { ok: false, error: "Ngày lấy hàng phải từ hôm nay trở đi." };
  const parsed = acceptRequestSchema.safeParse({ acceptedKg: kg, pickupDate: form.pickupDate, payLaterAgreed: form.payLater, note: trimmed(form.note), rowVersion: request.rowVersion });
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Ghi chú tối đa 1000 ký tự." };
}

/** Kiểm tra form từ chối (SALE-03.1): lý do bắt buộc, tối đa 1000 ký tự. */
export function buildDeclinePayload(note: string, request: Pick<PurchaseRequest, "rowVersion">): ReviewResult<z.infer<typeof declineRequestSchema>> {
  const parsed = declineRequestSchema.safeParse({ note: note.trim(), rowVersion: request.rowVersion });
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Nhập lý do từ chối, tối đa 1000 ký tự." };
}
