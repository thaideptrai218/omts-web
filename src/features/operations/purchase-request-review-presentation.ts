import { REQUEST_STATUS_IDS } from "@/features/trader-purchases/contracts";
import { formatDate } from "@/features/trader-purchases/presentation";
import { isUsableKgPerCage } from "@/shared/format/cage-quantity";
import { cagesWithEstimate, resolveQuantityInput, type CageQuantityValue } from "@/shared/format/cage-request-quantity";
import { acceptRequestSchema, declineRequestSchema, requestSendingSchema, type PurchaseRequest } from "./new-module-contracts";
import type { z } from "zod";

/** Logic thuần của màn duyệt "Yêu cầu mua hàu" (Chủ HTX / quản lý vùng, SCR-SALE-02), khớp PurchaseRequestsController. */
export type ReviewSending = z.infer<typeof requestSendingSchema>;
export type ReviewResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Mã trạng thái gửi lên `statusId`; "Hoàn thành" không có mã riêng (cờ fulfilled của đơn đã chấp nhận). */
export const REVIEW_STATUS_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  [String(REQUEST_STATUS_IDS.awaiting), "Chờ phản hồi"], [String(REQUEST_STATUS_IDS.accepted), "Đã chấp nhận"],
  [String(REQUEST_STATUS_IDS.declined), "Bị từ chối"], [String(REQUEST_STATUS_IDS.cancelled), "Đã hủy"], [String(REQUEST_STATUS_IDS.ordered), "Hoàn thành"],
];

/** BR-SALE-02: chỉ trả lời một lần, khi đơn còn "Chờ phản hồi". */
export const canRespondToRequest = (request: Pick<PurchaseRequest, "statusId">) => request.statusId === REQUEST_STATUS_IDS.awaiting || request.statusId === REQUEST_STATUS_IDS.awaitingStaff;

/** The Owner makes an order (Đặt hàng) from a request that waits for an answer, or from an older accepted one that no invoice has fulfilled. */
export const canOrderRequest = (request: Pick<PurchaseRequest, "statusId" | "fulfilled">) =>
  request.statusId === REQUEST_STATUS_IDS.awaiting || request.statusId === REQUEST_STATUS_IDS.accepted && !request.fulfilled;

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

/** Tóm tắt phản hồi của Chủ HTX cho một dòng danh sách (lồng chấp nhận, ngày lấy, trả sau hoặc lý do từ chối/hủy). */
export function reviewResponseSummary(request: PurchaseRequest, kgPerCage?: number): { headline: string; note: string | null } {
  const response = request.response;
  if (request.statusId === REQUEST_STATUS_IDS.ordered) return { headline: request.salesOrderCode ? `Đã đặt hàng ${request.salesOrderCode}` : "Đã đặt hàng", note: response?.note ?? null };
  if (request.statusId === REQUEST_STATUS_IDS.cancelled) return { headline: "Thương lái đã hủy", note: request.cancelReason };
  if (!response) return { headline: "Chưa có phản hồi", note: null };
  if (response.acceptedCages === null) return { headline: "Đã từ chối", note: response.note };
  const parts = [cagesWithEstimate(response.acceptedCages, kgPerCage)];
  if (response.pickupDate) parts.push(`lấy ngày ${formatDate(response.pickupDate)}`);
  parts.push(response.payLaterAgreed ? "cho trả sau" : "không trả sau");
  return { headline: parts.join(" · "), note: response.note };
}

/** `quantity`: số nhập theo lồng hoặc kg; kg được làm tròn thành lồng nguyên bằng kg/lồng trung bình của HTX. */
export type AcceptForm = { quantity: CageQuantityValue; pickupDate: string; payLater: boolean; note: string };
const trimmed = (text: string) => text.trim() || null;

/** Kiểm tra form chấp nhận (SALE-03.0): số lồng nguyên > 0, không vượt số lồng yêu cầu; ngày lấy không trước hôm nay. */
export function buildAcceptPayload(form: AcceptForm, request: Pick<PurchaseRequest, "requestedCages" | "rowVersion">, today: string, kgPerCage?: number): ReviewResult<z.infer<typeof acceptRequestSchema>> {
  const unit = isUsableKgPerCage(kgPerCage) ? form.quantity.unit : "cages";
  const { cages, error } = resolveQuantityInput(unit, form.quantity.text, kgPerCage);
  if (cages === undefined) return { ok: false, error: error ?? "Nhập số lồng chấp nhận lớn hơn 0." };
  if (cages > request.requestedCages) return { ok: false, error: `Số lồng chấp nhận (${cages}) không được vượt quá ${request.requestedCages} lồng thương lái đã yêu cầu.` };
  if (!form.pickupDate || form.pickupDate < today) return { ok: false, error: "Ngày lấy hàng phải từ hôm nay trở đi." };
  const parsed = acceptRequestSchema.safeParse({ acceptedCages: cages, pickupDate: form.pickupDate, payLaterAgreed: form.payLater, note: trimmed(form.note), rowVersion: request.rowVersion });
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Ghi chú tối đa 1000 ký tự." };
}

/** Kiểm tra form từ chối (SALE-03.1): lý do bắt buộc, tối đa 1000 ký tự. */
export function buildDeclinePayload(note: string, request: Pick<PurchaseRequest, "rowVersion">): ReviewResult<z.infer<typeof declineRequestSchema>> {
  const parsed = declineRequestSchema.safeParse({ note: note.trim(), rowVersion: request.rowVersion });
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Nhập lý do từ chối, tối đa 1000 ký tự." };
}
