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
    expect(employeeViewerAccess({ subjectType: "CooperativeOwner" }, [])).toEqual({ read: true, manage: true, payroll: true });
  });
  it("gives a Zone Manager a read-only view of working information without payroll", () => {
    expect(employeeViewerAccess(staff, labor)).toEqual({ read: true, manage: false, payroll: false });
  });
  it("gives the Accountant payroll views but no management", () => {
    expect(employeeViewerAccess(staff, [...labor.slice(0, 1), { functionCode: "PAYROLL", action: "View" }])).toEqual({ read: true, manage: false, payroll: true });
  });
  it("denies a Staff account without LABOR_WORKERS View", () => {
    expect(employeeViewerAccess(staff, [{ functionCode: "PAYROLL", action: "View" }]).read).toBe(false);
  });
  it("names the pay columns that a viewer without payroll access never sees", () => {
    expect(payrollColumnKeys).toEqual(["hours", "debt"]);
  });
});

describe("employee profile tabs", () => {
  const labels = (manage: boolean, payroll: boolean) => visibleEmployeeTabs(manage, payroll).map((tab) => tab.label);
  it("shows every tab to the Owner", () => {
    expect(labels(true, true)).toEqual(["Thông tin", "Công việc", "Ngân hàng", "Tài khoản đăng nhập", "Phiếu lương", "Nợ và tạm ứng"]);
  });
  it("shows only Công việc to a Zone Manager (no bank, personal, account, payroll or debt tab)", () => {
    expect(labels(false, false)).toEqual(["Công việc"]);
  });
  it("adds payroll tabs, still without personal or bank, for the Accountant", () => {
    expect(labels(false, true)).toEqual(["Công việc", "Phiếu lương", "Nợ và tạm ứng"]);
  });
  it("renders the reduced tab list", () => {
    render(<EmployeeTabs idPrefix="x" active="work" onChange={vi.fn()} manage={false} payroll={false} />);
    expect(screen.queryByRole("tab", { name: "Ngân hàng" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Phiếu lương" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Công việc" })).toBeTruthy();
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
