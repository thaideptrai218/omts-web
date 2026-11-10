import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const body = { customerId: null, walkInCustomer: true, zoneId: null, lines: [{ productId: id(1), harvestLotId: id(2), kg: 5 }], payment: { cashAmount: 100000, rest: "None" }, deduplicationKey: id(9) };

describe("kế hoạch BFF cho hóa đơn bán", () => {
  it("chỉ cho đọc các hành động đã biết, đúng đường dẫn backend", () => {
    expect(planOperation("sales-invoices", "GET", q("action=lots"))).toMatchObject({ path: "/api/harvest-lots/for-sale", permission: "Create" });
    expect(planOperation("sales-invoices", "GET", q(`action=detail&id=${id(3)}`))).toMatchObject({ path: `/api/sales-invoices/${id(3)}`, permission: "View" });
    expect(planOperation("sales-invoices", "GET", q(`action=open-requests&customerId=${id(4)}`))?.path).toContain(`customerId=${id(4)}`);
    expect(planOperation("sales-invoices", "GET", q("action=delete"))).toBeUndefined();
    expect(planOperation("sales-invoices", "GET", q(`action=lots&id=${id(3)}`))).toBeUndefined();
  });
  it("ghi hóa đơn: kiểm tra thân yêu cầu, chặn trường lạ và khóa chống lập trùng bắt buộc", () => {
    expect(planOperation("sales-invoices", "POST", q(), { action: "create", body })).toMatchObject({ method: "POST", path: "/api/sales-invoices", permission: "Create" });
    expect(planOperation("sales-invoices", "POST", q(), { action: "create", body: { ...body, extra: 1 } })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "create", body: { ...body, deduplicationKey: undefined } })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "create", body: { ...body, walkInCustomer: false } })).toBeUndefined();
  });
  it("kết thúc bán và gửi lại cần id; gửi lại không nhận thân yêu cầu", () => {
    expect(planOperation("sales-invoices", "POST", q(), { action: "finish", id: id(3), body: { wantsQrCode: true } })?.path).toBe(`/api/sales-invoices/${id(3)}/finish`);
    expect(planOperation("sales-invoices", "POST", q(), { action: "finish", body: { wantsQrCode: true } })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "resend", id: id(3), body: { x: 1 } })).toBeUndefined();
  });
  it("bán VietQR: tạo nhận rest VietQr và trả về giao dịch chờ hoặc hóa đơn", () => {
    const qr = { ...body, payment: { cashAmount: 0, rest: "VietQr" } };
    const plan = planOperation("sales-invoices", "POST", q(), { action: "create", body: qr });
    expect(plan).toMatchObject({ method: "POST", path: "/api/sales-invoices", permission: "Create" });
    const pending = { code: "HD000124", status: "Awaiting", zone: { id: id(1), code: "VP01", name: "V" }, customer: null, walkInCustomer: true, total: 5, cashAmount: 0, toPayAmount: 5, receivedAmount: 0, vietQr: null, createdAt: "2026-11-09T03:00:00+07:00", invoiceId: null, invoice: null, endedAt: null };
    expect(plan?.schema.safeParse(pending).success).toBe(true);
    expect(plan?.schema.safeParse({ nothing: 1 }).success).toBe(false);
    expect(planOperation("sales-invoices", "POST", q(), { action: "create", body: { ...qr, payment: { cashAmount: 0, rest: "Transfer" } } })).toBeUndefined();
  });
  it("đọc danh sách và chi tiết giao dịch chờ; mã phải đúng dạng và không lẫn với hành động khác", () => {
    expect(planOperation("sales-invoices", "GET", q("action=pending"))).toMatchObject({ path: "/api/sales-invoices/pending", permission: "Create", method: "GET" });
    expect(planOperation("sales-invoices", "GET", q("action=pending&code=HD000124"))).toMatchObject({ path: "/api/sales-invoices/pending/HD000124", permission: "Create" });
    expect(planOperation("sales-invoices", "GET", q("action=pending&code=../x"))).toBeUndefined();
    expect(planOperation("sales-invoices", "GET", q("action=pending&code=HD000124&code=HD000125"))).toBeUndefined();
    expect(planOperation("sales-invoices", "GET", q("action=lots&code=HD000124"))).toBeUndefined();
    expect(planOperation("sales-invoices", "GET", q(`action=pending&id=${id(3)}`))).toBeUndefined();
  });
  it("đổi phương thức và dừng giao dịch chờ: cần mã hợp lệ, thân chặt chẽ, quyền Create", () => {
    const change = { payment: { cashAmount: 5, rest: "None" } };
    expect(planOperation("sales-invoices", "POST", q(), { action: "change-payment", id: "HD000124", body: change })).toMatchObject({ method: "POST", path: "/api/sales-invoices/pending/HD000124/change-payment", permission: "Create" });
    expect(planOperation("sales-invoices", "POST", q(), { action: "change-payment", id: "HD000124", body: { payment: { cashAmount: 5, rest: "VietQr" } } })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "change-payment", body: change })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "change-payment", id: "x/../y", body: change })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "stop", id: "HD000124", body: { confirmed: true } })).toMatchObject({ path: "/api/sales-invoices/pending/HD000124/stop", permission: "Create" });
    expect(planOperation("sales-invoices", "POST", q(), { action: "stop", id: "HD000124", body: { confirmed: false } })).toBeUndefined();
    expect(planOperation("sales-invoices", "POST", q(), { action: "stop", id: "HD000124", body: {} })).toBeUndefined();
    // Mã hóa đơn đang chờ không được dùng làm id của kết thúc bán / gửi lại.
    expect(planOperation("sales-invoices", "POST", q(), { action: "finish", id: "HD000124", body: { wantsQrCode: true } })).toBeUndefined();
  });
  it("quyền: Chủ HTX được, thương lái không, nhân viên cần quyền SALES_INVOICES", () => {
    expect(operationAllowed("sales-invoices", { subjectType: "CooperativeOwner" }, [], "Create")).toBe(true);
    expect(operationAllowed("sales-invoices", { subjectType: "Trader" }, [], "Create")).toBe(false);
    expect(operationAllowed("sales-invoices", { subjectType: "Staff" }, [], "Create")).toBe(false);
  });
});
