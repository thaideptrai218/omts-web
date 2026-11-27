"use client";
import { Subtabs } from "@/components/ui/management-screen/management-table";

/** KiotViet section 7: payslips and debt/advances of the employee, offered to whoever holds payroll access. */
export const payrollTabs = [{ key: "payslips", label: "Phiếu lương" }, { key: "debt", label: "Nợ và tạm ứng" }] as const;
export type PayrollTabKey = typeof payrollTabs[number]["key"];
export type AnyTabKey = "information" | "salary" | PayrollTabKey;
export const isPayrollTab = (key: AnyTabKey): key is PayrollTabKey => key === "payslips" || key === "debt";

/** Tabs a viewer can open: Thông tin always, the salary setup for the pay rules' holders, payslips and debt for payroll access. A tab that would end in a 403 is not shown. */
export function visibleEmployeeTabs(access: { payroll: boolean; salary: boolean }) {
  return [{ key: "information", label: "Thông tin" }, ...(access.salary ? [{ key: "salary", label: "Thiết lập lương" }] : []), ...(access.payroll ? payrollTabs : [])] as { key: AnyTabKey; label: string }[];
}

export function EmployeeTabs({ idPrefix, active, onChange, access }: { idPrefix: string; active: AnyTabKey; onChange(key: AnyTabKey): void; access: { payroll: boolean; salary: boolean } }) {
  return <Subtabs label="Hồ sơ nhân viên" tabs={visibleEmployeeTabs(access)} value={active} onChange={onChange} idPrefix={idPrefix} />;
}
