// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { employeeViewerAccess, payrollColumnKeys } from "./employee-viewer-access";
import { EmployeeTabs, visibleEmployeeTabs } from "./employee-tabs";
import { isPermissionDenied, PermissionDeniedNotice } from "./permission-denied-notice";

afterEach(cleanup);
const staff = { subjectType: "Staff" };
const labor = [{ functionCode: "LABOR_WORKERS", action: "View" }, { functionCode: "LABOR_WORKERS", action: "Edit" }];

describe("employee viewer access (by held function codes, not role names)", () => {
  it("lets the Owner do everything", () => {
    expect(employeeViewerAccess({ subjectType: "CooperativeOwner" }, [])).toEqual({ read: true, manage: true, payroll: true, salary: true, salaryEdit: true });
  });
  it("gives a Zone Manager a read-only view of working information without payroll", () => {
    expect(employeeViewerAccess(staff, labor)).toEqual({ read: true, manage: false, payroll: false, salary: false, salaryEdit: false });
  });
  it("gives the Accountant payroll views but no management", () => {
    expect(employeeViewerAccess(staff, [...labor.slice(0, 1), { functionCode: "PAYROLL", action: "View" }])).toEqual({ read: true, manage: false, payroll: true, salary: false, salaryEdit: false });
  });
  it("denies a Staff account without LABOR_WORKERS View", () => {
    expect(employeeViewerAccess(staff, [{ functionCode: "PAYROLL", action: "View" }]).read).toBe(false);
  });
  it("names the pay columns that a viewer without payroll access never sees", () => {
    expect(payrollColumnKeys).toEqual(["salaryType", "debt"]);
  });
});

describe("employee profile tabs", () => {
  const labels = (payroll: boolean, salary: boolean) => visibleEmployeeTabs({ payroll, salary }).map((tab) => tab.label);
  it("shows every tab to the Owner", () => {
    expect(labels(true, true)).toEqual(["Thông tin", "Thiết lập lương", "Phiếu lương", "Nợ và tạm ứng"]);
  });
  it("shows only Thông tin to a Zone Manager", () => {
    expect(labels(false, false)).toEqual(["Thông tin"]);
  });
  it("gives the Accountant the salary setup and payroll tabs", () => {
    const access = employeeViewerAccess(staff, [{ functionCode: "LABOR_WORKERS", action: "View" }, { functionCode: "PAY_RULES", action: "View" }, { functionCode: "PAYROLL", action: "View" }]);
    expect(labels(access.payroll, access.salary)).toEqual(["Thông tin", "Thiết lập lương", "Phiếu lương", "Nợ và tạm ứng"]);
    expect(access.salaryEdit).toBe(false);
  });
  it("renders the reduced tab list", () => {
    render(<EmployeeTabs idPrefix="x" active="information" onChange={vi.fn()} access={{ payroll: false, salary: false }} />);
    expect(screen.queryByRole("tab", { name: "Phiếu lương" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Thiết lập lương" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Thông tin" })).toBeTruthy();
  });
});

describe("permission-denied state", () => {
  it("recognises the 403 wording and nothing else", () => {
    expect(isPermissionDenied("Bạn không có quyền thực hiện thao tác này.")).toBe(true);
    expect(isPermissionDenied("Không kết nối được máy chủ.")).toBe(false);
    expect(isPermissionDenied(undefined)).toBe(false);
  });
  it("offers a way back to the overview and no retry", () => {
    render(<PermissionDeniedNotice message="Bạn không có quyền thực hiện thao tác này." />);
    expect(screen.getByRole("alert").textContent).toContain("Bạn không có quyền");
    expect(screen.getByRole("link", { name: "Về tổng quan" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.queryByRole("button", { name: /Tải lại|Thử lại/ })).toBeNull();
  });
});
