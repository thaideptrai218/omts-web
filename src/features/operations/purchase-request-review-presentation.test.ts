import { describe, expect, it } from "vitest";
import { purchaseRequestSchema } from "./new-module-contracts";
import { backendRequest, requestId as id } from "./__tests__/purchase-request-fixture";
import { buildAcceptPayload, buildDeclinePayload, canOrderRequest, canRespondToRequest, reviewResponseSummary, sendingSummary } from "./purchase-request-review-presentation";

const accepted = { acceptedKg: 100, pickupDate: "2026-11-13", payLaterAgreed: true, note: "Ok", respondedAt: "2026-11-09T09:00:00+07:00" };

describe("purchase request review contract", () => {
  it("parses the backend kg view and rejects the retired cage shape", () => {
    expect(purchaseRequestSchema.safeParse(backendRequest()).success).toBe(true);
    expect(purchaseRequestSchema.safeParse(backendRequest({ response: accepted, statusId: 3202, fulfilled: true, sendings: [{ channel: "Sms", phoneNumber: "0900000001", deliveryStatusId: 1602, deliveryStatus: "Sent", deliveryStatusAt: "2026-11-09T09:01:00+07:00" }] })).success).toBe(true);
    expect(purchaseRequestSchema.safeParse({ id, code: "YC-1", requestedCages: 2, status: "AWAITING_STAFF" }).success).toBe(false);
    expect(purchaseRequestSchema.safeParse({ ...backendRequest(), requestedKg: "5" }).success).toBe(false);
  });
});

describe("purchase request review logic", () => {
  it("lets the Owner respond only while the request awaits a response", () => {
    expect(canRespondToRequest({ statusId: 3201 })).toBe(true);
    for (const statusId of [3202, 3203, 3204]) expect(canRespondToRequest({ statusId })).toBe(false);
  });
  it("summarises accepted, declined and cancelled responses", () => {
    expect(reviewResponseSummary(backendRequest()).headline).toBe("Chưa có phản hồi");
    expect(reviewResponseSummary(backendRequest({ statusId: 3202, response: accepted }))).toEqual({ headline: "100 kg · lấy ngày 13/11/2026 · cho trả sau", note: "Ok" });
    expect(reviewResponseSummary(backendRequest({ statusId: 3203, response: { ...accepted, acceptedKg: null, pickupDate: null, payLaterAgreed: null, note: "Hết hàng" } }))).toEqual({ headline: "Đã từ chối", note: "Hết hàng" });
    expect(reviewResponseSummary(backendRequest({ statusId: 3204, cancelReason: "Đổi ý" }))).toEqual({ headline: "Thương lái đã hủy", note: "Đổi ý" });
  });
  it("labels the delivery status of each sending and flags failures", () => {
    expect(sendingSummary({ channel: "Sms", phoneNumber: "0900000001", deliveryStatusId: 1603, deliveryStatus: "Not sent", deliveryStatusAt: null })).toEqual({ channel: "SMS · 0900000001", status: "Gửi chưa thành công", failed: true });
    expect(sendingSummary({ channel: "ZaloOa", phoneNumber: null, deliveryStatusId: null, deliveryStatus: null, deliveryStatusAt: null })).toEqual({ channel: "Zalo OA", status: "Chưa có trạng thái", failed: false });
  });
  it("validates the accept form against the backend rules", () => {
    const request = backendRequest(), form = { kg: "100,5", pickupDate: "2026-11-12", payLater: false, note: "  " };
    expect(buildAcceptPayload(form, request, "2026-11-09")).toEqual({ ok: true, value: { acceptedKg: 100.5, pickupDate: "2026-11-12", payLaterAgreed: false, note: null, rowVersion: "AAAA" } });
    for (const patch of [{ kg: "0" }, { kg: "-1" }, { kg: "1.2345" }, { kg: "abc" }, { kg: "120.6" }, { pickupDate: "2026-11-08" }, { pickupDate: "" }, { note: "x".repeat(1001) }]) expect(buildAcceptPayload({ ...form, ...patch }, request, "2026-11-09").ok).toBe(false);
    expect(buildAcceptPayload({ ...form, kg: "120.5", pickupDate: "2026-11-09" }, request, "2026-11-09").ok).toBe(true);
  });
  it("requires a decline reason", () => {
    expect(buildDeclinePayload("  Hết hàng ", { rowVersion: "AAAA" })).toEqual({ ok: true, value: { note: "Hết hàng", rowVersion: "AAAA" } });
    expect(buildDeclinePayload("   ", { rowVersion: "AAAA" }).ok).toBe(false);
    expect(buildDeclinePayload("x".repeat(1001), { rowVersion: "AAAA" }).ok).toBe(false);
  });
});

describe("order from a request", () => {
  it("lets the Owner order a waiting request or an accepted one nothing has fulfilled, and shows the order of an ordered one", () => {
    expect(canOrderRequest({ statusId: 3201, fulfilled: false })).toBe(true);
    expect(canOrderRequest({ statusId: 3202, fulfilled: false })).toBe(true);
    for (const request of [{ statusId: 3202, fulfilled: true }, { statusId: 3203, fulfilled: false }, { statusId: 3204, fulfilled: false }, { statusId: 3205, fulfilled: false }]) expect(canOrderRequest(request)).toBe(false);
    expect(reviewResponseSummary(backendRequest({ statusId: 3205, salesOrderCode: "DH000007" }))).toEqual({ headline: "Đã đặt hàng DH000007", note: null });
    expect(purchaseRequestSchema.safeParse(backendRequest({ statusId: 3205, salesOrderId: id, salesOrderCode: "DH000007" })).success).toBe(true);
  });
});
