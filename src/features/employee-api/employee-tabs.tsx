"use client";
import { Subtabs } from "@/components/ui/management-screen/management-table";
export const employeeTabs = [
  { key: "information", label: "Thông tin" }, { key: "work", label: "Công việc" },
  { key: "bank", label: "Ngân hàng" }, { key: "account", label: "Tài khoản đăng nhập" },
] as const;
export type EmployeeTabKey = typeof employeeTabs[number]["key"];
/** KiotViet section 7: payslips and debt/advances of the employee, offered to whoever holds payroll access. */
export const payrollTabs = [{ key: "payslips", label: "Phiếu lương" }, { key: "debt", label: "Nợ và tạm ứng" }] as const;
export type PayrollTabKey = typeof payrollTabs[number]["key"];
export type AnyTabKey = EmployeeTabKey | PayrollTabKey;
export const isPayrollTab = (key: AnyTabKey): key is PayrollTabKey => key === "payslips" || key === "debt";

/** Tabs a viewer can open. Personal, bank and account tabs are for managers only: a tab that would end in a 403 is not shown. */
export function visibleEmployeeTabs(manage: boolean, payroll: boolean) {
  return [...(manage ? employeeTabs : employeeTabs.filter((tab) => tab.key === "work")), ...(payroll ? payrollTabs : [])];
}

export function EmployeeTabs({ idPrefix, active, onChange, errors, label = "Hồ sơ nhân viên", payroll = false, manage = true }: {
  idPrefix: string; active: AnyTabKey; onChange(key: AnyTabKey): void;
  errors?: readonly EmployeeTabKey[]; label?: string; payroll?: boolean; manage?: boolean;
}) {
  return <Subtabs label={label} tabs={visibleEmployeeTabs(manage, payroll)} value={active} onChange={onChange} idPrefix={idPrefix} errors={errors} />;
}
