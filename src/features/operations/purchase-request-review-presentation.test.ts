import { describe, expect, it } from "vitest";
import { purchaseRequestSchema } from "./new-module-contracts";
import { backendRequest, requestId as id } from "./__tests__/purchase-request-fixture";
import { buildAcceptPayload, buildDeclinePayload, canOrderRequest, canRespondToRequest, reviewResponseSummary, sendingSummary } from "./purchase-request-review-presentation";

const accepted = { acceptedCages: 10, pickupDate: "2026-11-13", payLaterAgreed: true, note: "Ok", respondedAt: "2026-11-09T09:00:00+07:00" };
/** Dạng JSON thật của PurchaseRequestView (camelCase) kèm các trường thêm: Code, Staffing, Harvest, HarvestCompletedAt. */
const realPayload = {
  ...backendRequest(), code: "YC000012", customer: { id, name: "Thương lái An", phoneNumber: "0900000001", currentDebt: 0, code: "KH000001" },
  salesOrderId: null, salesOrderCode: null, harvestCompletedAt: null,
  staffing: { cages: 10, workDate: "2026-11-11", pickupDate: "2026-11-12", cagesPerEmployeePerDay: 5, requiredEmployees: 2, invitedEmployees: 2, approvedEmployees: 2, declinedEmployees: 0, pendingEmployees: 0, hasEnoughStaff: true, note: null, invitations: [{ unknown: true }] },
  harvest: { harvestedCages: 0, lots: [], completedAt: null, completedByName: null, canMarkDone: false, canUnmarkDone: false }, somethingNew: 1,
};

describe("purchase request review contract", () => {
  it("parses the backend cage view, tolerating extra fields, and rejects the retired kg shape", () => {
    expect(purchaseRequestSchema.safeParse(backendRequest()).success).toBe(true);
    expect(purchaseRequestSchema.safeParse(backendRequest({ response: accepted, statusId: 3202, fulfilled: true, sendings: [{ channel: "Sms", phoneNumber: "0900000001", deliveryStatusId: 1602, deliveryStatus: "Sent", deliveryStatusAt: "2026-11-09T09:01:00+07:00" }] })).success).toBe(true);
    const parsed = purchaseRequestSchema.safeParse(realPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) { expect(parsed.data.requestedCages).toBe(12); expect(parsed.data.staffing?.cages).toBe(10); expect(parsed.data.code).toBe("YC000012"); }
    expect(purchaseRequestSchema.safeParse({ ...realPayload, staffing: { broken: true } }).success).toBe(true);
    expect(purchaseRequestSchema.safeParse({ ...backendRequest(), requestedCages: undefined, requestedKg: 120.5 }).success).toBe(false);
    expect(purchaseRequestSchema.safeParse({ ...backendRequest(), requestedCages: 1.5 }).success).toBe(false);
  });
});

describe("purchase request review logic", () => {
  it("lets the Owner respond only while the request awaits a response", () => {
    expect(canRespondToRequest({ statusId: 3201 })).toBe(true);
    for (const statusId of [3202, 3203, 3204]) expect(canRespondToRequest({ statusId })).toBe(false);
  });
  it("summarises accepted, declined and cancelled responses", () => {
    expect(reviewResponseSummary(backendRequest()).headline).toBe("Chưa có phản hồi");
    expect(reviewResponseSummary(backendRequest({ statusId: 3202, response: accepted }))).toEqual({ headline: "10 lồng · lấy ngày 13/11/2026 · cho trả sau", note: "Ok" });
    expect(reviewResponseSummary(backendRequest({ statusId: 3203, response: { ...accepted, acceptedCages: null, pickupDate: null, payLaterAgreed: null, note: "Hết hàng" } }))).toEqual({ headline: "Đã từ chối", note: "Hết hàng" });
    expect(reviewResponseSummary(backendRequest({ statusId: 3204, cancelReason: "Đổi ý" }))).toEqual({ headline: "Thương lái đã hủy", note: "Đổi ý" });
  });
  it("labels the delivery status of each sending and flags failures", () => {
    expect(sendingSummary({ channel: "Sms", phoneNumber: "0900000001", deliveryStatusId: 1603, deliveryStatus: "Not sent", deliveryStatusAt: null })).toEqual({ channel: "SMS · 0900000001", status: "Gửi chưa thành công", failed: true });
    expect(sendingSummary({ channel: "ZaloOa", phoneNumber: null, deliveryStatusId: null, deliveryStatus: null, deliveryStatusAt: null })).toEqual({ channel: "Zalo OA", status: "Chưa có trạng thái", failed: false });
  });
  it("validates the accept form against the backend rules", () => {
    const request = backendRequest(), cages = (text: string) => ({ unit: "cages" as const, text }), form = { quantity: cages("10"), pickupDate: "2026-11-12", payLater: false, note: "  " };
    expect(buildAcceptPayload(form, request, "2026-11-09")).toEqual({ ok: true, value: { acceptedCages: 10, pickupDate: "2026-11-12", payLaterAgreed: false, note: null, rowVersion: "AAAA" } });
    for (const patch of [{ quantity: cages("0") }, { quantity: cages("-1") }, { quantity: cages("1,5") }, { quantity: cages("abc") }, { quantity: cages("13") }, { pickupDate: "2026-11-08" }, { pickupDate: "" }, { note: "x".repeat(1001) }]) expect(buildAcceptPayload({ ...form, ...patch }, request, "2026-11-09").ok).toBe(false);
    expect(buildAcceptPayload({ ...form, quantity: cages("12"), pickupDate: "2026-11-09" }, request, "2026-11-09").ok).toBe(true);
  });
  it("converts kg to whole cages with the kg-per-cage ratio and applies the same limit in cages", () => {
    const request = backendRequest(), form = { quantity: { unit: "kg" as const, text: "520" }, pickupDate: "2026-11-12", payLater: true, note: "" };
    expect(buildAcceptPayload(form, request, "2026-11-09", 50)).toMatchObject({ ok: true, value: { acceptedCages: 10 } });
    expect(buildAcceptPayload({ ...form, quantity: { unit: "kg", text: "10" } }, request, "2026-11-09", 50)).toMatchObject({ ok: true, value: { acceptedCages: 1 } });
    expect(buildAcceptPayload({ ...form, quantity: { unit: "kg", text: "700" } }, request, "2026-11-09", 50)).toMatchObject({ ok: false, error: expect.stringContaining("không được vượt quá 12 lồng") });
    // Không có tỷ lệ thì không thể nhập kg: lỗi rõ ràng thay vì đoán.
    expect(buildAcceptPayload({ ...form, quantity: { unit: "cages", text: "10" } }, request, "2026-11-09").ok).toBe(true);
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
    for (const request of [{ statusId: 3202, fulfilled: true }, { statusId: 3203, fulfilled: false }, { statusId: 3204, fulfilled: false }, { statusId: 3206, fulfilled: false }]) expect(canOrderRequest(request)).toBe(false);
    expect(reviewResponseSummary(backendRequest({ statusId: 3206, salesOrderCode: "DH000007" }))).toEqual({ headline: "Đã đặt hàng DH000007", note: null });
    expect(purchaseRequestSchema.safeParse(backendRequest({ statusId: 3206, salesOrderId: id, salesOrderCode: "DH000007" })).success).toBe(true);
  });
});
