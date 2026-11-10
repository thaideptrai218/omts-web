import { describe, expect, it } from "vitest";
import { placeRequestSchema, type TraderRequest } from "./contracts";
import { countByStatus, filterByStatus, formatKg, parseKgInput, responseSummary, statusKey } from "./presentation";

const base: TraderRequest = { id: "11111111-1111-4111-8111-111111111111", productId: "22222222-2222-4222-8222-222222222222", productName: "Hàu sữa", requestedKg: 500, pickupDate: "2026-11-12", note: null,
  sentAt: "2026-11-09T08:15:00+07:00", statusId: 3201, status: "Awaiting response", fulfilled: false, canCancel: true, response: null, cancelReason: null, cancelledAt: null, rowVersion: "AAAA" };
const accepted: TraderRequest = { ...base, statusId: 3202, response: { acceptedKg: 300, pickupDate: "2026-11-13", payLaterAgreed: false, note: "Đến trước 8 giờ", respondedAt: "2026-11-09T09:00:00+07:00" } };

describe("statusKey", () => {
  it("maps backend status ids and treats Fulfilled as a flag over Accepted", () => {
    expect(statusKey(base)).toBe("awaiting");
    expect(statusKey(accepted)).toBe("accepted");
    expect(statusKey({ statusId: 3202, fulfilled: true })).toBe("fulfilled");
    expect(statusKey({ statusId: 3203, fulfilled: false })).toBe("declined");
    expect(statusKey({ statusId: 3204, fulfilled: false })).toBe("cancelled");
    expect(statusKey({ statusId: 9999, fulfilled: false })).toBe("awaiting");
  });
});

describe("filtering", () => {
  const rows = [base, accepted, { ...accepted, fulfilled: true }, { ...base, statusId: 3204 }];
  it("returns everything when no status is chosen and unions chosen statuses", () => {
    expect(filterByStatus(rows, new Set())).toHaveLength(4);
    expect(filterByStatus(rows, new Set(["accepted", "cancelled"]))).toHaveLength(2);
    expect(filterByStatus(rows, new Set(["declined"]))).toHaveLength(0);
  });
  it("counts per status", () => {
    expect(countByStatus(rows)).toEqual({ awaiting: 1, accepted: 1, fulfilled: 1, declined: 0, cancelled: 1 });
  });
});

describe("responseSummary", () => {
  it("shows no response, accepted details, decline and cancel reasons", () => {
    expect(responseSummary(base)).toEqual({ headline: "Chưa có phản hồi", note: null });
    expect(responseSummary(accepted)).toEqual({ headline: "300 kg · lấy ngày 13/11/2026 · không trả sau", note: "Đến trước 8 giờ" });
    expect(responseSummary({ ...accepted, response: { ...accepted.response!, payLaterAgreed: true } }).headline).toContain("cho trả sau");
    expect(responseSummary({ ...base, statusId: 3203, response: { acceptedKg: null, pickupDate: null, payLaterAgreed: null, note: "Chưa đủ hàu", respondedAt: "2026-11-09T09:00:00+07:00" } }))
      .toEqual({ headline: "Hợp tác xã từ chối", note: "Chưa đủ hàu" });
    expect(responseSummary({ ...base, statusId: 3204, cancelReason: "Đổi kế hoạch" })).toEqual({ headline: "Bạn đã hủy yêu cầu", note: "Đổi kế hoạch" });
  });
});

describe("kg input", () => {
  it.each([["500", 500], ["1,5", 1.5], [" 0.125 ", 0.125]])("parses %s", (text, expected) => expect(parseKgInput(text)).toBe(expected));
  it.each(["", "0", "-1", "1.2345", "abc", "1e3", "1,2,3"])("rejects %s", (text) => expect(parseKgInput(text)).toBeUndefined());
  it("formats vi-VN kg and matches the backend place contract", () => {
    expect(formatKg(1234.5)).toBe("1.234,5 kg");
    expect(placeRequestSchema.safeParse({ productId: base.productId, requestedKg: 0.125, pickupDate: "2026-11-12", note: null }).success).toBe(true);
    expect(placeRequestSchema.safeParse({ productId: base.productId, requestedKg: 0.1255, pickupDate: "2026-11-12", note: null }).success).toBe(false);
  });
});
