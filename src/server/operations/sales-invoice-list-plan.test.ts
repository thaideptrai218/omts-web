import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { salesInvoiceListPlan as plan } from "./sales-invoice-list-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const url = (p: { path: string } | undefined) => new URL(p!.path, "http://x");

describe("kế hoạch BFF cho danh sách hóa đơn bán", () => {
  it("danh sách: View, truyền đúng bộ lọc và phân trang mặc định", () => {
    const p = plan("GET", q(`action=list&from=2026-11-01&to=2026-11-09&zoneId=${id(1)}&customerId=${id(2)}&harvestLotId=${id(3)}&statusId=3501&paid=false&code=HD01&cashCollectedByMe=true`));
    expect(p).toMatchObject({ area: "sales-invoice-list", method: "GET", permission: "View", zoneId: id(1) });
    const u = url(p);
    expect(u.pathname).toBe("/api/sales-invoices");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ from: "2026-11-01", to: "2026-11-09", statusId: "3501", paid: "false", code: "HD01", cashCollectedByMe: "true", page: "1", pageSize: "20" });
  });
  it("xuất danh sách: Export, file export, không phân trang", () => {
    const p = plan("GET", q("action=export&from=2026-11-01&to=2026-11-09&page=2"));
    expect(p).toBeUndefined();
    const ok = plan("GET", q("action=export&from=2026-11-01&to=2026-11-09"));
    expect(ok).toMatchObject({ permission: "Export", file: "export" });
    expect(url(ok).pathname).toBe("/api/sales-invoices/export");
    expect(url(ok).searchParams.has("page")).toBe(false);
  });
  it("in một hóa đơn: action=export kèm id, không kèm bộ lọc", () => {
    expect(plan("GET", q(`action=export&id=${id(5)}`))).toMatchObject({ permission: "Export", file: "export", path: `/api/sales-invoices/${id(5)}/print` });
    expect(plan("GET", q(`action=export&id=${id(5)}&from=2026-11-01`))).toBeUndefined();
  });
  it("chi tiết: View và kiểm id trả về", () => {
    expect(plan("GET", q(`action=detail&id=${id(5)}`))).toMatchObject({ permission: "View", path: `/api/sales-invoices/${id(5)}`, expectedId: id(5) });
    expect(plan("GET", q("action=detail"))).toBeUndefined();
    expect(plan("GET", q(`action=detail&id=${id(5)}&page=2`))).toBeUndefined();
  });
  it("tra lô theo mã", () => {
    expect(url(plan("GET", q("action=lots&lotCode=B03%2F1026"))).searchParams.get("lotCode")).toBe("B03/1026");
    expect(plan("GET", q("action=lots"))).toBeUndefined();
  });
  it("chặn tham số lạ, ngày sai, khoảng ngược, GUID sai, trạng thái lạ, lặp khóa, thân GET", () => {
    for (const bad of ["action=list&raftId=" + id(1), "action=list&from=2026-13-01", "action=list&from=2026-11-09&to=2026-11-01", "action=list&zoneId=abc", "action=list&statusId=3503",
      "action=list&paid=yes", "action=list&pageSize=500", "action=list&page=0", "action=list&lotCode=x", "action=delete", "", "action=list&page=1&page=2", `action=list&id=${id(1)}`, "action=list&cashCollectedByMe=false"]) {
      expect(plan("GET", q(bad)), bad).toBeUndefined();
    }
    expect(plan("GET", q("action=list"), {})).toBeUndefined();
  });
  it("gửi lại: Create, thân rỗng", () => {
    expect(plan("POST", q(), { action: "resend", id: id(1), body: {} })).toMatchObject({ method: "POST", permission: "Create", path: `/api/sales-invoices/${id(1)}/resend` });
    expect(plan("POST", q(), { action: "resend", id: id(1), body: { x: 1 } })).toBeUndefined();
    expect(plan("POST", q(), { action: "resend", id: "abc" })).toBeUndefined();
  });
  it("sửa hóa đơn (nhánh chưa gộp): PUT, quyền Edit, hai loại không lẫn trường", () => {
    const line = { productId: id(2), harvestLotId: id(3), kg: 10, unitPrice: 85000 };
    const ok = plan("POST", q(), { action: "correct", id: id(1), body: { kind: "DataEntryError", reason: "Nhập sai kg", rowVersion: "AAA", lines: [line], discount: 0 } });
    expect(ok).toMatchObject({ method: "PUT", permission: "Edit", path: `/api/sales-invoices/${id(1)}/correction` });
    expect(plan("POST", q(), { action: "correct", id: id(1), body: { kind: "PriceCutAfterClaim", reason: "Khiếu nại", rowVersion: "AAA", priceCutAmount: 50000 } })).toBeDefined();
    expect(plan("POST", q(), { action: "correct", id: id(1), body: { kind: "PriceCutAfterClaim", reason: "x", rowVersion: "AAA", priceCutAmount: 5, lines: [line] } })).toBeUndefined();
    expect(plan("POST", q(), { action: "correct", id: id(1), body: { kind: "DataEntryError", reason: "x", rowVersion: "AAA", lines: [line], priceCutAmount: 5 } })).toBeUndefined();
    expect(plan("POST", q(), { action: "correct", id: id(1), body: { kind: "DataEntryError", reason: " ", rowVersion: "AAA", lines: [line] } })).toBeUndefined();
    expect(plan("POST", q(), { action: "correct", id: id(1), body: { kind: "DataEntryError", reason: "x", lines: [line] } })).toBeUndefined();
  });
  it("hủy hóa đơn (nhánh chưa gộp): POST, quyền Delete, bắt buộc lý do và phiên bản", () => {
    const body = { reason: "Bán nhầm", rowVersion: "AAA", cashGivenBack: [{ paymentId: id(9), givenBack: true }], confirmOwedBack: true };
    expect(plan("POST", q(), { action: "cancel", id: id(1), body })).toMatchObject({ method: "POST", permission: "Delete", path: `/api/sales-invoices/${id(1)}/cancel` });
    expect(plan("POST", q(), { action: "cancel", id: id(1), body: { rowVersion: "AAA" } })).toBeUndefined();
    expect(plan("POST", q(), { action: "cancel", id: id(1), body: { ...body, extra: 1 } })).toBeUndefined();
  });
  it("ghi: chỉ POST, không tham số truy vấn, không thao tác lạ", () => {
    expect(plan("PUT", q(), { action: "cancel", id: id(1), body: {} })).toBeUndefined();
    expect(plan("POST", q("a=1"), { action: "resend", id: id(1) })).toBeUndefined();
    expect(plan("POST", q(), { action: "create", id: id(1) })).toBeUndefined();
  });
});
