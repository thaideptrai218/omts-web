"use client";
import { EmployeeKindBadgeById } from "@/features/employee-api/employee-kind-badge-by-id";
import { Fragment, useState } from "react";
import { Money } from "@/features/operations/ui";
import type { Slip } from "./contracts";
import { formatHours } from "./payroll-model";
import { PayrollSlipDetail, type SlipTab } from "./payroll-slip-detail";
import s from "./payroll-screen.module.css";

const heads: readonly [string, boolean][] = [["Mã phiếu lương", false], ["Tên nhân viên", false], ["Giờ công", true], ["Lương chính", true], ["Thưởng/Phụ cấp", true], ["Tổng thu nhập", true], ["Tạm ứng trừ", true], ["Thực lĩnh", true], ["Đã trả", true], ["Còn cần trả", true]];
const sum = (slips: readonly Slip[], pick: (slip: Slip) => number) => slips.reduce((total, slip) => total + pick(slip), 0);

/**
 * Tab "Phiếu lương" of an open sheet, like the KiotViet payroll sheet: a totals row stays on top, then one row per payslip. The code opens that payslip's detail
 * (payments, attendance); the hours and the main pay open it on "Chấm công chi tiết", which explains the figure day by day.
 */
export function PayrollSheetSlipsTab({ slips }: { slips: readonly Slip[] }) {
  const [open, setOpen] = useState<{ id: string; tab: SlipTab }>();
  const toggle = (id: string, tab: SlipTab) => setOpen((value) => value?.id === id && value.tab === tab ? undefined : { id, tab });
  return <><div className={s.subTable}><table className={s.table}>
    <caption className="sr-only">Phiếu lương</caption>
    <thead>
      <tr>{heads.map(([label, right]) => <th key={label} scope="col" className={right ? s.right : undefined}>{label}</th>)}</tr>
      <tr className={s.totalRow} data-testid="payroll-slips-total"><th scope="row" colSpan={2}>Tổng ({slips.length} nhân viên)</th>
        <td className={s.right}>{formatHours(sum(slips, (slip) => slip.hours))}</td><td className={s.right}><Money value={sum(slips, (slip) => slip.mainPay)} /></td>
        <td className={s.right}><Money value={sum(slips, (slip) => slip.bonus)} /></td><td className={s.right}><Money value={sum(slips, (slip) => slip.income)} /></td>
        <td className={s.right}><Money value={sum(slips, (slip) => slip.deduction)} /></td><td className={s.right}><Money value={sum(slips, (slip) => slip.net)} /></td>
        <td className={s.right}><Money value={sum(slips, (slip) => slip.paid)} /></td><td className={s.right}><Money value={sum(slips, (slip) => slip.outstanding)} /></td></tr>
    </thead>
    <tbody>{slips.length === 0 ? <tr><td colSpan={heads.length} className={s.emptyCell}>Bảng lương chưa có phiếu lương.</td></tr> : slips.map((slip) => <Fragment key={slip.id}>
      <tr data-selected={open?.id === slip.id || undefined}>
        <td><button type="button" className={s.codeButton} aria-expanded={open?.id === slip.id && open.tab === "payments"} onClick={() => toggle(slip.id, "payments")}>{slip.code}</button></td>
        <td><a className={`${s.name} ${s.link}`} href={`/workspace/employees?recordId=${slip.employeeId}&search=${encodeURIComponent(slip.employeeName)}`}>{slip.employeeName}</a><EmployeeKindBadgeById employeeId={slip.employeeId} /></td>
        <td className={s.right}><button type="button" className={s.linkButton} aria-label={`Xem chấm công chi tiết của ${slip.employeeName}`} onClick={() => toggle(slip.id, "attendance")}>{formatHours(slip.hours)}</button></td>
        <td className={s.right}><button type="button" className={s.linkButton} aria-label={`Xem cách tính lương chính của ${slip.employeeName}`} onClick={() => toggle(slip.id, "attendance")}><Money value={slip.mainPay} /></button>{slip.hourlyRateNote && <div className={s.muted}>× {slip.hourlyRateNote}</div>}</td>
        <td className={s.right}><Money value={slip.bonus} /></td><td className={s.right}><Money value={slip.income} /></td><td className={s.right}><Money value={slip.deduction} /></td>
        <td className={s.right}><Money value={slip.net} /></td><td className={s.right}><Money value={slip.paid} /></td><td className={s.right}><Money value={slip.outstanding} /></td>
      </tr>
    </Fragment>)}</tbody>
  </table></div>
  {/* Under the table, not inside it: the table scrolls sideways on a narrow screen and the detail must stay in view. */}
  {open && <PayrollSlipDetail key={`${open.id}:${open.tab}`} slipId={open.id} initialTab={open.tab} />}</>;
}