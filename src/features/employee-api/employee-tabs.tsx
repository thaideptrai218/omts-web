"use client";
import { Subtabs } from "@/components/ui/management-screen/management-table";
export const employeeTabs = [
  { key: "information", label: "Thông tin" }, { key: "work", label: "Công việc" },
  { key: "bank", label: "Ngân hàng" }, { key: "account", label: "Tài khoản đăng nhập" },
] as const;
export type EmployeeTabKey = typeof employeeTabs[number]["key"];
/** KiotViet section 7: payslips and debt/advances of the employee, offered to the Owner only. */
export const payrollTabs = [{ key: "payslips", label: "Phiếu lương" }, { key: "debt", label: "Nợ và tạm ứng" }] as const;
export type PayrollTabKey = typeof payrollTabs[number]["key"];
export type AnyTabKey = EmployeeTabKey | PayrollTabKey;
export const isPayrollTab = (key: AnyTabKey): key is PayrollTabKey => key === "payslips" || key === "debt";
export function EmployeeTabs({ idPrefix, active, onChange, errors, label = "Hồ sơ nhân viên", payroll = false }: {
  idPrefix: string; active: AnyTabKey; onChange(key: AnyTabKey): void;
  errors?: readonly EmployeeTabKey[]; label?: string; payroll?: boolean;
}) {
  return <Subtabs label={label} tabs={payroll ? [...employeeTabs, ...payrollTabs] : employeeTabs} value={active} onChange={onChange} idPrefix={idPrefix} errors={errors} />;
}
