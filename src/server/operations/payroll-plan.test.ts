import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import * as c from "@/features/payroll/contracts";
import { operationAllowed } from "@/features/operations/permissions";

const q = (s = "") => new URLSearchParams(s);
const sheet = "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d01", slip = "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d02", employee = "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d03";
const payload = { paidAt: "2026-11-11T08:30:00.000Z", method: "Cash", note: "" };

describe("payroll sheet reads", () => {
  it("lists with repeated status for the backend and only contract filters", () => {
    const plan = planOperation("payroll", "GET", q("action=list&search=th%C3%A1ng&periodType=Monthly&status=Provisional,Finalized&sortBy=total&sortDir=desc&page=2&pageSize=15"))!;
    expect(plan).toMatchObject({ method: "GET", permission: "View" });
    const url = new URL(plan.path, "http://x");
    expect(url.pathname).toBe("/api/payrolls");
    expect(url.searchParams.getAll("status")).toEqual(["Provisional", "Finalized"]);
    expect(url.searchParams.get("sortBy")).toBe("total");
    expect(url.searchParams.get("action")).toBeNull();
  });
  it("reads one sheet with an expected id and exports with the Export permission", () => {
    expect(planOperation("payroll", "GET", q(`action=detail&id=${sheet}`))).toMatchObject({ path: `/api/payrolls/${sheet}`, expectedId: sheet, permission: "View" });
    expect(planOperation("payroll", "GET", q(`action=export&id=${sheet}`))).toMatchObject({ path: `/api/payrolls/${sheet}/export`, file: "export", permission: "Export" });
    const list = planOperation("payroll", "GET", q("action=export&status=Cancelled&periodType=Custom"))!;
    expect(list).toMatchObject({ file: "export", permission: "Export" });
    expect(list.path).toBe("/api/payrolls/export?periodType=Custom&status=Cancelled");
  });
  it.each(["action=list&status=Draft", "action=list&status=Finalized,Finalized", "action=list&sortBy=name;drop", "action=list&pageSize=101", "action=list&from=2026-12-01&to=2026-11-01",
    "action=list&x=1", "action=list&action=list", "action=detail", "action=detail&id=nope", `action=detail&id=${sheet}&search=a`, "action=other", ""])("rejects %s", (query) => {
    expect(planOperation("payroll", "GET", q(query)), query).toBeUndefined();
  });
});

describe("payroll sheet writes", () => {
  const create = { periodType: "Custom", from: "2026-11-01", to: "2026-11-15", scope: "Selected", employeeIds: [employee] };
  it("maps create, reload, finalize, cancel and pay to the contract paths", () => {
    expect(planOperation("payroll", "POST", q(), { action: "create", body: create })).toMatchObject({ method: "POST", path: "/api/payrolls", permission: "Create", body: create });
    expect(planOperation("payroll", "POST", q(), { action: "create", body: { periodType: "Monthly", from: "2026-10-01", to: "2026-10-31", scope: "All" } })).toMatchObject({ path: "/api/payrolls" });
    expect(planOperation("payroll", "POST", q(), { action: "reload", id: sheet, body: { mode: "WorkingDaysOnly" } })).toMatchObject({ path: `/api/payrolls/${sheet}/reload`, permission: "Edit", expectedId: sheet });
    expect(planOperation("payroll", "POST", q(), { action: "finalize", id: sheet, body: { expenseMonth: "2026-10" } })).toMatchObject({ path: `/api/payrolls/${sheet}/finalize`, permission: "Edit" });
    const cancel = planOperation("payroll", "POST", q(), { action: "cancel", id: sheet, body: {} })!;
    expect(cancel).toMatchObject({ path: `/api/payrolls/${sheet}/cancel`, permission: "Delete" });
    expect(cancel.body).toBeUndefined();
    const pay = planOperation("payroll", "POST", q(), { action: "pay", id: sheet, body: { ...payload, lines: [{ slipId: slip, amount: 100000 }] } });
    expect(pay).toMatchObject({ path: `/api/payrolls/${sheet}/payments`, permission: "Create" });
    expect(pay?.schema).toBe(c.voucherResult);
  });
  it.each([
    ["create without employees for a selected scope", { action: "create", body: { periodType: "Custom", from: "2026-11-01", to: "2026-11-15", scope: "Selected" } }],
    ["create with employees for scope All", { action: "create", body: { periodType: "Custom", from: "2026-11-01", to: "2026-11-15", scope: "All", employeeIds: [employee] } }],
    ["create with reversed dates", { action: "create", body: { periodType: "Custom", from: "2026-11-15", to: "2026-11-01", scope: "All" } }],
    ["create with extra field", { action: "create", body: { periodType: "Monthly", from: "2026-10-01", to: "2026-10-31", scope: "All", total: 1 } }],
    ["create with an id", { action: "create", id: sheet, body: { periodType: "Monthly", from: "2026-10-01", to: "2026-10-31", scope: "All" } }],
    ["reload with unknown mode", { action: "reload", id: sheet, body: { mode: "Everything" } }],
    ["finalize with bad month", { action: "finalize", id: sheet, body: { expenseMonth: "2026-13" } }],
    ["finalize without id", { action: "finalize", body: { expenseMonth: "2026-10" } }],
    ["cancel with a body", { action: "cancel", id: sheet, body: { reason: "x" } }],
    ["pay with zero amount", { action: "pay", id: sheet, body: { ...payload, lines: [{ slipId: slip, amount: 0 }] } }],
    ["pay with fractional amount", { action: "pay", id: sheet, body: { ...payload, lines: [{ slipId: slip, amount: 10.5 }] } }],
    ["pay without lines", { action: "pay", id: sheet, body: { ...payload, lines: [] } }],
    ["pay with bad method", { action: "pay", id: sheet, body: { ...payload, method: "Card", lines: [{ slipId: slip, amount: 1 }] } }],
    ["unknown action", { action: "delete", id: sheet, body: {} }],
  ])("rejects %s", (_name, input) => { expect(planOperation("payroll", "POST", q(), input)).toBeUndefined(); });
  it("rejects a query string or another verb on writes", () => {
    expect(planOperation("payroll", "POST", q("a=1"), { action: "cancel", id: sheet, body: {} })).toBeUndefined();
    expect(planOperation("payroll", "DELETE", q(`action=detail&id=${sheet}`))).toBeUndefined();
  });
});

describe("payroll payments", () => {
  it("lists payments and payable employees", () => {
    const list = planOperation("payroll-payments", "GET", q("action=list&search=PC&from=2026-11-01&to=2026-11-30&page=1&pageSize=15"))!;
    expect(new URL(list.path, "http://x").pathname).toBe("/api/payroll-payments");
    expect(list.schema).toBe(c.paymentPage);
    expect(planOperation("payroll-payments", "GET", q("action=payable&search=an"))).toMatchObject({ path: "/api/payrolls/payable-employees?search=an", permission: "View" });
    expect(planOperation("payroll-payments", "GET", q("action=list&from=2026-12-01&to=2026-11-01"))).toBeUndefined();
    expect(planOperation("payroll-payments", "GET", q("action=detail"))).toBeUndefined();
  });
  it("creates a standalone payment only with a strict body", () => {
    const body = { employeeId: employee, amount: 500000, ...payload };
    expect(planOperation("payroll-payments", "POST", q(), { action: "create", body })).toMatchObject({ method: "POST", path: "/api/payroll-payments", permission: "Create", body });
    for (const bad of [{ ...body, amount: 0 }, { ...body, extra: 1 }, { ...body, employeeId: "x" }, { ...body, paidAt: "yesterday" }]) {
      expect(planOperation("payroll-payments", "POST", q(), { action: "create", body: bad })).toBeUndefined();
    }
    expect(planOperation("payroll-payments", "POST", q(), { action: "pay", id: sheet, body })).toBeUndefined();
  });
});

describe("payroll areas are Owner-only (hard rule)", () => {
  const grants = [{ functionCode: "PAYROLL", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones", zoneIds: [] } }] as never;
  it.each(["payroll", "payroll-payments"] as const)("%s admits only the Cooperative Owner, whatever function grants a Staff account has", (area) => {
    expect(operationAllowed(area, { subjectType: "CooperativeOwner" }, [], "Delete")).toBe(true);
    for (const subjectType of ["Staff", "Trader", "Admin"]) {
      expect(operationAllowed(area, { subjectType }, grants, "View")).toBe(false);
      expect(operationAllowed(area, { subjectType }, grants, "Export")).toBe(false);
    }
  });
  it("lists only employees owed pay unless includeAll=true is sent", () => {
    expect(planOperation("payroll-payments", "GET", q("action=payable&search=an&includeAll=true"))?.path).toBe("/api/payrolls/payable-employees?search=an&includeAll=true");
    expect(planOperation("payroll-payments", "GET", q("action=payable"))?.path).toBe("/api/payrolls/payable-employees");
    expect(planOperation("payroll-payments", "GET", q("action=payable&includeAll=false"))).toBeUndefined();
  });
});

describe("employee payslips (KiotViet section 7)", () => {
  it("reads the payslips of one employee and one payslip, validating the response shapes", () => {
    const list = planOperation("payroll", "GET", q(`action=employee-slips&id=${employee}&status=Finalized&page=2&pageSize=15`))!;
    expect(list).toMatchObject({ method: "GET", permission: "View", path: `/api/employees/${employee}/payslips?status=Finalized&page=2&pageSize=15` });
    expect(list.schema).toBe(c.employeeSlipPage);
    expect(planOperation("payroll", "GET", q(`action=employee-slips&id=${employee}`))?.path).toBe(`/api/employees/${employee}/payslips`);
    expect(planOperation("payroll", "GET", q(`action=slip&id=${slip}`))).toMatchObject({ path: `/api/payroll-slips/${slip}`, expectedId: slip, permission: "View" });
    const base = { id: slip, code: "PL1", payrollId: sheet, payrollCode: "BL1", employeeId: employee, employeeName: "A", from: "2026-05-01", to: "2026-05-31", hours: 10, mainPay: 300000, bonus: 0, deduction: 0, income: 300000, net: 300000, paid: 0, outstanding: 300000, status: "Finalized",
      lines: [{ jobName: "Cho ăn", hours: 10, hourlyRate: 30000, amount: 300000 }], payments: [], attendance: [{ date: "2026-05-02", jobName: "Cho ăn", hours: 5 }] };
    expect(c.slipDetail.safeParse(base).success).toBe(true);
    expect(c.slipDetail.safeParse({ ...base, lines: [{ jobName: "x", hours: 1, hourlyRate: 1.5, amount: 1 }] }).success).toBe(false);
    expect(c.employeeSlipPage.safeParse({ items: [], total: 0, page: 1, pageSize: 15, summary: { outstanding: 0 } }).success).toBe(false);
  });
  it.each(["action=employee-slips&id=nope", "action=employee-slips", `action=employee-slips&id=${employee}&status=Draft`, `action=employee-slips&id=${employee}&search=x`, "action=slip", `action=slip&id=${slip}&page=1`])("rejects %s", (query) => {
    expect(planOperation("payroll", "GET", q(query)), query).toBeUndefined();
  });
  it("filters payments by employee, and the slip reads stay out of the payments area", () => {
    expect(planOperation("payroll-payments", "GET", q(`action=list&employeeId=${employee}&page=1`))?.path).toBe(`/api/payroll-payments?employeeId=${employee}&page=1`);
    expect(planOperation("payroll-payments", "GET", q("action=list&employeeId=bad"))).toBeUndefined();
    expect(planOperation("payroll-payments", "GET", q(`action=slip&id=${slip}`))).toBeUndefined();
  });
});
