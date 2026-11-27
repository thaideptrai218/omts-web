"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import Link from "next/link";
import type { Employee } from "./contracts";
import { accountLabel, dateLabel, employeeTypeLabel, employmentLabel, genderLabel } from "./employee-editor-model";
import styles from "./employee-detail.module.css";

/** Photo of the employee, or the first letter of the name when there is none or the address no longer loads (a signed address expires). */
export function EmployeeAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className: string }) {
  const [failed, setFailed] = useState<string>();
  const shown = photoUrl && failed !== photoUrl ? photoUrl : undefined;
  return <span className={className} aria-hidden={shown ? undefined : true}>{shown
    // eslint-disable-next-line @next/next/no-img-element -- an address signed by the storage
    ? <img src={shown} alt={`Ảnh ${name}`} referrerPolicy="no-referrer" onError={() => setFailed(shown)} />
    : Array.from(name.trim())[0]?.toLocaleUpperCase("vi") ?? "?"}</span>;
}

type Row = [label: string, value: string | null | undefined];

/** The rows of the grid, three to a line like KiotViet. Personal and bank rows only for a caller the backend lets see them (`canMaintain`). */
export function infoRows(employee: Employee): Row[] {
  const zones = employee.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ");
  const bank = employee.bankAccount ? `${employee.bankAccount.bankName} · ${employee.bankAccount.accountNumber} · ${employee.bankAccount.accountHolderName}` : null;
  const address = [employee.address, employee.ward, employee.area].filter(Boolean).join(", ");
  const rows: Row[] = [
    ["Số điện thoại", employee.phoneNumber], ["Loại nhân viên", employeeTypeLabel(employee.employeeType)], ["Vùng làm việc", zones],
    ["Loại công việc", employee.jobTypes.map(job => job.name).join(", ")], ["Ngày bắt đầu làm việc", employee.startDate ? dateLabel(employee.startDate) : null], ["Ngày làm cuối", employee.lastWorkingDay ? dateLabel(employee.lastWorkingDay) : null],
  ];
  if (employee.canMaintain) rows.push(["Số CMND/CCCD", employee.idNumber], ["Ngày sinh", employee.birthday ? dateLabel(employee.birthday) : null], ["Giới tính", genderLabel(employee.gender) || null],
    ["Địa chỉ", address], ["Thông tin ngân hàng", bank], ["Thông tin khác", employee.otherInformation]);
  return rows;
}

/**
 * Tab "Thông tin": a read-only grid with the photo and the name on top. Editing is the "Cập nhật" dialog; the footer also ends or resumes work
 * (the Owner). The login account is read here and managed on the Tài khoản người dùng screen.
 */
export function EmployeeInfoTab({ employee, manage, busy, onEdit, onStatusAction }: { employee: Employee; manage: boolean; busy: boolean; onEdit(): void; onStatusAction(): void }) {
  const account = employee.account;
  return <div>
    <div className={styles.infoHead}>
      <EmployeeAvatar name={employee.fullName} photoUrl={employee.photoUrl} className={styles.infoPhoto} />
      <div>
        <h3>{employee.fullName}</h3>
        <p>Mã nhân viên: <span className="font-mono tabular-nums">{employee.code}</span> <StatusPill tone={employee.status === "Employed" ? "success" : "neutral"}>{employmentLabel(employee.status)}</StatusPill></p>
      </div>
    </div>
    <dl className={styles.grid3}>
      {infoRows(employee).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value ? undefined : styles.empty}>{value || "—"}</dd></div>)}
      {manage && employee.canMaintain && <div><dt>Tài khoản đăng nhập</dt><dd className={account ? undefined : styles.empty}>{account
        ? <><Link className={styles.accountLink} href={`/workspace/accounts?accountId=${encodeURIComponent(account.id)}`}>@{account.username}</Link> · {accountLabel(account.status)}</>
        : "—"}</dd></div>}
    </dl>
    {employee.notes && <p className={styles.notes}><InterfaceIcon name="pencil" className="size-3.5" /> Ghi chú: {employee.notes}</p>}
    {employee.typeHistory.length > 0 && <div className={styles.history}><h4>Lịch sử loại nhân viên</h4><ul>{employee.typeHistory.map(period => <li key={`${period.type}-${period.effectiveFrom}`}>{employeeTypeLabel(period.type)} · Từ {dateLabel(period.effectiveFrom)}</li>)}</ul></div>}
    {manage && employee.canMaintain && <footer className={styles.footer}>
      <div><Button variant="ghost" disabled={busy} onClick={onStatusAction}>{employee.status === "Employed" ? "Ngừng làm việc" : "Làm việc lại"}</Button></div>
      <div><Button disabled={busy} onClick={onEdit}><InterfaceIcon name="pencil" className="size-4" />Cập nhật</Button></div>
    </footer>}
  </div>;
}
