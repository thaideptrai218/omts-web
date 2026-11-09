import { describe, expect, it } from "vitest";
import { withdrawBody, withdrawPreview, withdrawn, withdrawalNotices } from "./withdraw-contracts";
import { deliveryLabel, reasonProblem, toCallCount } from "./withdraw-format";

const id = "00000000-0000-4000-8000-000000000001";
const notice = { customerId: id, customerName: "A", phoneNumber: null, invoiceCodes: ["HD1"], channel: "Sms", deliveryStatusId: 1603, notifiedInApp: false, toCall: true };

describe("thu hồi nguồn gốc", () => {
  it("lý do bắt buộc và tối đa 1.000 ký tự", () => {
    expect(reasonProblem("  ")).toMatch(/lý do/i);
    expect(reasonProblem("Phát hiện nhầm lô")).toBeUndefined();
    expect(reasonProblem("x".repeat(1001))).toMatch(/1000/);
    expect(withdrawBody.safeParse({ reason: "ok" }).success).toBe(true);
    expect(withdrawBody.safeParse({ reason: " " }).success).toBe(false);
    expect(withdrawBody.safeParse({ reason: "ok", extra: 1 }).success).toBe(false);
  });
  it("nhãn trạng thái gửi theo mã ổn định và đếm khách cần gọi", () => {
    expect([1601, 1602, 1603, 9].map(deliveryLabel)).toEqual(["Đang gửi", "Đã gửi", "Chưa gửi được", "Không xác định"]);
    expect(toCallCount([notice, { ...notice, toCall: false }])).toBe(1);
  });
  it("hợp đồng nhận phản hồi backend và bỏ trường lý do nội bộ nếu có", () => {
    const preview = { lotId: id, lotCode: "L1", originState: "Published", publishedAt: null, traders: [{ customerId: id, customerName: "A", phoneNumber: null, traderAccountId: null, invoiceCodes: ["HD1"] }], walkInInvoiceCodes: [], message: "x", messageCode: "MSG-GEN-04", notice: null, noticeCode: null };
    expect(withdrawPreview.safeParse(preview).success).toBe(true);
    const done = withdrawn.safeParse({ lot: { id, lotCode: "L1", originState: "Withdrawn", withdrawalReason: "nội bộ" }, notices: [notice], walkInInvoiceCodes: [], noticeCode: null });
    expect(done.success && done.data.lot).not.toHaveProperty("withdrawalReason");
    expect(withdrawalNotices.safeParse({ lotId: id, lotCode: "L1", originState: "Withdrawn", withdrawnAt: null, notices: [], walkInInvoiceCodes: [] }).success).toBe(true);
  });
});
