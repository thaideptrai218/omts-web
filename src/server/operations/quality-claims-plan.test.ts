import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { claimUpload } from "./claim-upload-plan";
import { claimReportsPlan, qualityClaimsPlan } from "./quality-claims-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const version = "AAAAAAAAB9E=";

describe("kế hoạch BFF báo vấn đề chất lượng của thương lái", () => {
  it("đọc danh sách của tôi, một báo cáo và ảnh đúng đường dẫn /api/me", () => {
    expect(claimReportsPlan("GET", q("action=mine"))).toMatchObject({ area: "claim-reports", path: "/api/me/quality-claims?page=1&pageSize=20", permission: "Mine" });
    expect(claimReportsPlan("GET", q("action=mine&page=2&pageSize=50"))?.path).toBe("/api/me/quality-claims?page=2&pageSize=50");
    expect(claimReportsPlan("GET", q(`action=mine-detail&id=${id(1)}`))).toMatchObject({ path: `/api/me/quality-claims/${id(1)}`, expectedId: id(1) });
    expect(claimReportsPlan("GET", q(`action=photo&id=${id(1)}&index=2`))).toMatchObject({ path: `/api/me/quality-claims/${id(1)}`, file: "photo", index: 2 });
  });
  it("từ chối tham số lạ, trùng khóa, ảnh ngoài 0-9, mã sai và mọi ghi JSON", () => {
    expect(claimReportsPlan("GET", q("action=mine&v=1"))).toBeUndefined();
    expect(claimReportsPlan("GET", q("action=mine&page=1&page=2"))).toBeUndefined();
    expect(claimReportsPlan("GET", q("action=mine&pageSize=500"))).toBeUndefined();
    expect(claimReportsPlan("GET", q(`action=photo&id=${id(1)}&index=10`))).toBeUndefined();
    expect(claimReportsPlan("GET", q("action=mine-detail&id=abc"))).toBeUndefined();
    expect(claimReportsPlan("GET", q("action=mine-detail"))).toBeUndefined();
    expect(claimReportsPlan("POST", q(), { action: "submit", id: id(1), body: {} })).toBeUndefined();
  });
});

describe("kế hoạch BFF gửi báo cáo (multipart)", () => {
  it("trỏ tới hóa đơn của thương lái với 1-10 ảnh và quyền Submit", () => {
    const upload = claimUpload("claim-submit", id(7));
    expect(upload?.plan).toMatchObject({ area: "claim-reports", method: "POST", path: `/api/me/sales-invoices/${id(7)}/quality-claims`, permission: "Submit" });
    expect([upload?.minPhotos, upload?.maxPhotos, upload?.fileField]).toEqual([1, 10, "photos"]);
    expect(upload?.validator.safeParse({ description: "  Hàu bị chết  " })).toMatchObject({ success: true, data: { description: "Hàu bị chết" } });
    expect(upload?.validator.safeParse({ description: "   " }).success).toBe(false);
    expect(upload?.validator.safeParse({ description: "a".repeat(2001) }).success).toBe(false);
    expect(upload?.validator.safeParse({ description: "ok", extra: 1 }).success).toBe(false);
  });
  it("bỏ qua hành động lạ hoặc mã hóa đơn sai", () => {
    expect(claimUpload("other", id(7))).toBeUndefined();
    expect(claimUpload("claim-submit", "not-a-guid")).toBeUndefined();
  });
});

describe("kế hoạch BFF khiếu nại chất lượng của Chủ HTX", () => {
  it("danh sách có lọc trạng thái, chi tiết và ảnh dùng quyền View", () => {
    expect(qualityClaimsPlan("GET", q("action=list"))).toMatchObject({ area: "quality-claims", path: "/api/quality-claims?page=1&pageSize=20", permission: "View" });
    expect(qualityClaimsPlan("GET", q("action=list&statusId=3701&page=3&pageSize=100"))?.path).toBe("/api/quality-claims?page=3&pageSize=100&statusId=3701");
    expect(qualityClaimsPlan("GET", q(`action=detail&id=${id(2)}`))).toMatchObject({ path: `/api/quality-claims/${id(2)}`, expectedId: id(2) });
    expect(qualityClaimsPlan("GET", q(`action=photo&id=${id(2)}&index=0`))).toMatchObject({ file: "photo", index: 0, permission: "View" });
  });
  it("từ chối trạng thái lạ, pageSize > 100, trạng thái kèm chi tiết", () => {
    expect(qualityClaimsPlan("GET", q("action=list&statusId=9999"))).toBeUndefined();
    expect(qualityClaimsPlan("GET", q("action=list&pageSize=101"))).toBeUndefined();
    expect(qualityClaimsPlan("GET", q(`action=detail&id=${id(2)}&statusId=3701`))).toBeUndefined();
    expect(qualityClaimsPlan("GET", q(`action=list&id=${id(2)}`))).toBeUndefined();
  });
  it("chấp nhận cần đề nghị hợp lệ và rowVersion; ghi chú không bắt buộc, quyền Respond", () => {
    const plan = qualityClaimsPlan("POST", q(), { action: "accept", id: id(2), body: { offer: "ReturnAllGoods", note: null, rowVersion: version } });
    expect(plan).toMatchObject({ method: "POST", permission: "Respond", path: `/api/quality-claims/${id(2)}/accept`, expectedId: id(2) });
    expect(qualityClaimsPlan("POST", q(), { action: "accept", id: id(2), body: { offer: "PriceCutWholeInvoice", note: "Giảm 10%", rowVersion: version } })).toBeDefined();
    expect(qualityClaimsPlan("POST", q(), { action: "accept", id: id(2), body: { offer: "Refund", note: null, rowVersion: version } })).toBeUndefined();
    expect(qualityClaimsPlan("POST", q(), { action: "accept", id: id(2), body: { offer: "ReturnAllGoods", note: null } })).toBeUndefined();
    expect(qualityClaimsPlan("POST", q(), { action: "accept", id: id(2), body: { offer: "ReturnAllGoods", note: "x".repeat(1001), rowVersion: version } })).toBeUndefined();
  });
  it("từ chối bắt buộc có lý do; không nhận hành động lạ hay query kèm theo", () => {
    expect(qualityClaimsPlan("POST", q(), { action: "reject", id: id(2), body: { note: "Ảnh không rõ", rowVersion: version } })?.path).toBe(`/api/quality-claims/${id(2)}/reject`);
    expect(qualityClaimsPlan("POST", q(), { action: "reject", id: id(2), body: { note: "  ", rowVersion: version } })).toBeUndefined();
    expect(qualityClaimsPlan("POST", q(), { action: "reject", body: { note: "x", rowVersion: version } })).toBeUndefined();
    expect(qualityClaimsPlan("POST", q(), { action: "delete", id: id(2), body: {} })).toBeUndefined();
    expect(qualityClaimsPlan("POST", q("x=1"), { action: "reject", id: id(2), body: { note: "x", rowVersion: version } })).toBeUndefined();
    expect(qualityClaimsPlan("PUT", q(), {})).toBeUndefined();
  });
});
