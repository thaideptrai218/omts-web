import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";
import { projectInvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s = "") => new URLSearchParams(s);
const pay = { customerId: id(1), paymentDate: "2026-11-09", amount: 500000, method: "Cash", bankReference: null, collectedByAccountId: id(2), note: null, deduplicationKey: id(9) };

describe("kế hoạch BFF thanh toán của khách", () => {
  it("đọc biểu mẫu, danh sách chờ và chi tiết đúng đường dẫn, chặn tham số lạ", () => {
    expect(planOperation("customer-payments", "GET", q(`action=form&customerId=${id(1)}`))).toMatchObject({ path: `/api/customer-payments/form/${id(1)}`, permission: "View" });
    expect(planOperation("customer-payments", "GET", q("action=awaiting&page=2&pageSize=50"))?.path).toBe("/api/customer-payments/awaiting-confirmation?page=2&pageSize=50");
    expect(planOperation("customer-payments", "GET", q(`action=detail&id=${id(3)}`))).toMatchObject({ path: `/api/customer-payments/${id(3)}`, expectedId: id(3) });
    expect(planOperation("customer-payments", "GET", q("action=awaiting&v=1"))).toBeUndefined();
    expect(planOperation("customer-payments", "GET", q("action=awaiting&pageSize=1000"))).toBeUndefined();
  });
  it("ghi nhận: tiền mặt cần người nhận, chuyển khoản cần mã giao dịch, số tiền nguyên dương", () => {
    expect(planOperation("customer-payments", "POST", q(), { action: "record", body: pay })).toMatchObject({ path: "/api/customer-payments", permission: "Create" });
    expect(planOperation("customer-payments", "POST", q(), { action: "pay-back", body: pay })?.path).toBe("/api/customer-payments/pay-back");
    expect(planOperation("customer-payments", "POST", q(), { action: "record", body: { ...pay, collectedByAccountId: null } })).toBeUndefined();
    expect(planOperation("customer-payments", "POST", q(), { action: "record", body: { ...pay, method: "OtherTransfer", collectedByAccountId: null } })).toBeUndefined();
    expect(planOperation("customer-payments", "POST", q(), { action: "record", body: { ...pay, amount: 1.5 } })).toBeUndefined();
    expect(planOperation("customer-payments", "POST", q(), { action: "record", body: { ...pay, method: "VietQrInvoice" } })).toBeUndefined();
  });
  it("xác nhận/hủy cần ít nhất một khoản, hủy bắt buộc có lý do", () => {
    expect(planOperation("customer-payments", "POST", q(), { action: "confirm", body: { confirm: [id(4)], cancel: [] } })).toMatchObject({ path: "/api/customer-payments/confirmations", permission: "Edit" });
    expect(planOperation("customer-payments", "POST", q(), { action: "confirm", body: { confirm: [], cancel: [] } })).toBeUndefined();
    expect(planOperation("customer-payments", "POST", q(), { action: "confirm", body: { confirm: [], cancel: [{ id: id(4), reason: " " }] } })).toBeUndefined();
    expect(planOperation("customer-payments", "POST", q(), { action: "cancel", id: id(4), body: { reason: "Nhầm khách", rowVersion: "AAA=" } })?.path).toBe(`/api/customer-payments/${id(4)}/cancel`);
  });
  it("quyền toàn HTX: Chủ HTX, nhân viên có đúng hành động; thương lái không", () => {
    const grant = (action: string) => [{ functionCode: "CUSTOMER_PAYMENTS", action, dataScope: "AssignedZone", scope: { kind: "all-zones" } }] as never;
    expect(operationAllowed("customer-payments", { subjectType: "CooperativeOwner" }, [], "Create")).toBe(true);
    expect(operationAllowed("customer-payments", { subjectType: "Staff" }, grant("Create"), "Create")).toBe(true);
    expect(operationAllowed("customer-payments", { subjectType: "Staff" }, grant("View"), "Edit")).toBe(false);
    expect(operationAllowed("customer-payments", { subjectType: "Trader" }, [], "View")).toBe(false);
  });
  it("câu hỏi 409 vượt công nợ và trùng mã giao dịch được chiếu an toàn", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "confirmAboveDebt", customerName: "A", debtAmount: 100, amount: 300, owedBackAmount: 200 })).toEqual({ field: "confirmAboveDebt", debtAmount: 100, amount: 300, owedBackAmount: 200 });
    expect(projectInvoiceConfirmation(409, { confirmationField: "confirmDuplicateBankReference", paymentCode: "TK-001", amount: 5, paymentDate: "2026-11-01", bankReference: "SECRET" })).toEqual({ field: "confirmDuplicateBankReference", paymentCode: "TK-001", amount: 5, paymentDate: "2026-11-01" });
  });
});
