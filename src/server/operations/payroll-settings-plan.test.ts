import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { payrollSettingsPlan } from "./payroll-settings-plan";
import { payrollPreview, payrollSettings, payrollSettingsSaved } from "@/features/payroll-settings/contracts";

const q = (s = "") => new URLSearchParams(s);
const period = (start: string, end: string) => ({ start, end, name: end.slice(5, 7) + "/" + end.slice(0, 4) });
const settings = { payPeriodStartDay: 26, automaticPayroll: false, nextPeriods: [period("2026-09-26", "2026-10-25"), period("2026-10-26", "2026-11-25")], rowVersion: "AAAAAAAB" };

describe("kế hoạch BFF thiết lập kỳ lương", () => {
  it("đọc thiết lập và xem trước đúng đường dẫn, quyền View", () => {
    expect(payrollSettingsPlan("GET", q("action=settings"))).toMatchObject({ area: "payroll-settings", method: "GET", permission: "View", path: "/api/payroll-settings" });
    expect(payrollSettingsPlan("GET", q("action=preview&startDay=26&automaticPayroll=true"))).toMatchObject({ method: "GET", permission: "View", path: "/api/payroll-settings/preview?startDay=26&automaticPayroll=true" });
  });
  it("chặn tham số lạ, trùng, ngày ngoài 1-28 và cờ không phải true/false", () => {
    for (const bad of ["action=settings&x=1", "action=settings&action=settings", "action=preview", "action=preview&startDay=0&automaticPayroll=true",
      "action=preview&startDay=29&automaticPayroll=true", "action=preview&startDay=1.5&automaticPayroll=true", "action=preview&startDay=5&automaticPayroll=1", "action=other", ""]) {
      expect(payrollSettingsPlan("GET", q(bad)), bad).toBeUndefined();
    }
  });
  it("lưu: POST của trình duyệt được ánh xạ thành PUT, quyền Edit, bắt buộc rowVersion", () => {
    const body = { payPeriodStartDay: 25, automaticPayroll: true, rowVersion: "AAAAAAAB" };
    expect(payrollSettingsPlan("POST", q(), { action: "save", body })).toMatchObject({ method: "PUT", permission: "Edit", path: "/api/payroll-settings", body });
    expect(payrollSettingsPlan("POST", q(), { action: "save", body: { ...body, rowVersion: "" } })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "save", body: { payPeriodStartDay: 25, automaticPayroll: true } })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "save", body: { ...body, payPeriodStartDay: 29 } })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "save", body: { ...body, automaticPayroll: "true" } })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "save", body: { ...body, extra: 1 } })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "save", id: "00000000-0000-4000-8000-000000000001", body })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q(), { action: "delete", body })).toBeUndefined();
    expect(payrollSettingsPlan("POST", q("a=1"), { action: "save", body })).toBeUndefined();
    expect(payrollSettingsPlan("DELETE", q("action=settings"))).toBeUndefined();
  });
  it("lược đồ phản hồi khớp dữ liệu backend và từ chối dữ liệu sai", () => {
    expect(payrollSettings.safeParse(settings).success).toBe(true);
    expect(payrollSettings.safeParse({ ...settings, payPeriodStartDay: 31 }).success).toBe(false);
    expect(payrollSettings.safeParse({ ...settings, nextPeriods: [settings.nextPeriods[0]] }).success).toBe(false);
    expect(payrollSettingsSaved.safeParse({ settings, message: "Payroll settings saved.", messageCode: "MSG-GEN-05" }).success).toBe(true);
    expect(payrollPreview.safeParse({ payPeriodStartDay: 26, automaticPayroll: true, nextPeriods: settings.nextPeriods, message: "?", messageCode: "MSG-LABOR-36" }).success).toBe(true);
    expect(payrollPreview.safeParse({ payPeriodStartDay: 26, automaticPayroll: true, nextPeriods: settings.nextPeriods }).success).toBe(false);
  });
});
