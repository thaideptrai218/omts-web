"use client";
import { Subtabs } from "@/components/ui/management-screen/management-table";
export const employeeTabs = [
  { key: "information", label: "Thông tin" }, { key: "work", label: "Công việc" },
  { key: "bank", label: "Ngân hàng" }, { key: "account", label: "Tài khoản đăng nhập" },
] as const;
export type EmployeeTabKey = typeof employeeTabs[number]["key"];
export function EmployeeTabs({ idPrefix, active, onChange, errors, label = "Hồ sơ nhân viên" }: {
  idPrefix: string; active: EmployeeTabKey; onChange(key: EmployeeTabKey): void;
  errors?: readonly EmployeeTabKey[]; label?: string;
}) {
  return <Subtabs label={label} tabs={employeeTabs} value={active} onChange={onChange} idPrefix={idPrefix} errors={errors} />;
}
