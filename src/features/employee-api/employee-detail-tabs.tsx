"use client";
import { useId, useState } from "react";
import type { Employee } from "./contracts";
import { EmployeeAccountTab } from "./employee-account-tab";
import { dateLabel, employeeTypeLabel, employmentLabel } from "./employee-editor-model";
import { EmployeeTabs, employeeTabs, type EmployeeTabKey } from "./employee-tabs";
import styles from "./employee-screen.module.css";

function Details({ fields }: { fields: [string, string | null | undefined][] }) {
  return <dl className={styles.previewFields}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Chưa cập nhật"}</dd></div>)}</dl>;
}
export function EmployeeDetailTabs({ employee, onSaved, onRefresh, busy = false }: { employee: Employee; onSaved(employee: Employee): void; onRefresh(): void; busy?: boolean }) {
  const [active, setActive] = useState<EmployeeTabKey>("information");
  const prefix = useId();
  const denied = <p role="alert" className="my-4">Bạn không có quyền xem thông tin cá nhân và ngân hàng của nhân viên này.</p>;
  const bank = employee.bankAccount;
  const content = {
    information: !employee.canMaintain ? denied : <Details fields={[
      ["Họ và tên", employee.fullName], ["Số điện thoại", employee.phoneNumber], ["Ngày sinh", employee.birthday ? dateLabel(employee.birthday) : null],
      ["Địa chỉ", employee.address], ["Khu vực", employee.area], ["Phường / Xã", employee.ward], ["Thông tin khác", employee.otherInformation], ["Ghi chú", employee.notes],
    ]} />,
    work: <><Details fields={[
      ["Loại nhân viên", employeeTypeLabel(employee.employeeType)], ["Loại công việc", employee.jobTypes.map(job => job.name).join(", ")],
      ["Vùng làm việc", employee.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")],
      ["Tình trạng làm việc", employmentLabel(employee.status)], ["Ngày làm cuối", employee.lastWorkingDay ? dateLabel(employee.lastWorkingDay) : null],
    ]} /><h4 className="font-semibold">Lịch sử loại nhân viên</h4>{employee.typeHistory.length ? <ul className="my-3 space-y-2">{employee.typeHistory.map(period => <li key={`${period.type}-${period.effectiveFrom}`}>{employeeTypeLabel(period.type)} · Từ {dateLabel(period.effectiveFrom)}</li>)}</ul> : <p className="my-3">Chưa có lịch sử loại nhân viên.</p>}</>,
    bank: !employee.canMaintain ? denied : bank ? <Details fields={[["Ngân hàng", bank.bankName], ["Số tài khoản", bank.accountNumber], ["Chủ tài khoản", bank.accountHolderName]]} /> : <p className="my-4">Chưa có thông tin ngân hàng</p>,
    account: <fieldset disabled={busy}><EmployeeAccountTab employee={employee} onSaved={onSaved} onRefresh={onRefresh} /></fieldset>,
  };
  return <><EmployeeTabs idPrefix={prefix} active={active} onChange={setActive} />{employeeTabs.map(tab => <div key={tab.key} role="tabpanel" id={`${prefix}-panel-${tab.key}`} aria-labelledby={`${prefix}-tab-${tab.key}`} hidden={active !== tab.key} tabIndex={0}>{content[tab.key]}</div>)}</>;
}
