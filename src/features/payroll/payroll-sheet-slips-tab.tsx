"use client";
import { Fragment, useState } from "react";
import { Money } from "@/features/operations/ui";
import type { Slip } from "./contracts";
import { PayrollSlipDetail } from "./payroll-slip-detail";
import s from "./payroll-screen.module.css";

const heads: readonly [string, boolean][] = [["Mã phiếu lương", false], ["Tên nhân viên", false], ["Lương chính", true], ["Thưởng", true], ["Giảm trừ", true], ["Tổng thu nhập", true], ["Lương thực nhận", true], ["Đã trả", true], ["Còn cần trả", true]];

/** Tab "Phiếu lương" of an open sheet: each payslip code opens that payslip's detail (income, payments, attendance) under its row. */
export function PayrollSheetSlipsTab({ slips }: { slips: readonly Slip[] }) {
  const [open, setOpen] = useState<string>();
  return <div className={s.subTable}><table className={s.table}>
    <caption className="sr-only">Phiếu lương</caption>
    <thead><tr>{heads.map(([label, right]) => <th key={label} scope="col" className={right ? s.right : undefined}>{label}</th>)}</tr></thead>
    <tbody>{slips.length === 0 ? <tr><td colSpan={heads.length} className={s.emptyCell}>Bảng lương chưa có phiếu lương.</td></tr> : slips.map((slip) => <Fragment key={slip.id}>
      <tr data-selected={open === slip.id || undefined}>
        <td><button type="button" className={s.codeButton} aria-expanded={open === slip.id} onClick={() => setOpen((value) => value === slip.id ? undefined : slip.id)}>{slip.code}</button></td>
        <td><a className={`${s.name} ${s.link}`} href={`/workspace/employees?recordId=${slip.employeeId}&search=${encodeURIComponent(slip.employeeName)}`}>{slip.employeeName}</a></td>
        <td className={s.right}><Money value={slip.mainPay} /><div className={s.muted}>{slip.hours} giờ{slip.hourlyRateNote ? ` × ${slip.hourlyRateNote}` : ""}</div></td>
        <td className={s.right}><Money value={slip.bonus} /></td><td className={s.right}><Money value={slip.deduction} /></td><td className={s.right}><Money value={slip.income} /></td>
        <td className={s.right}><Money value={slip.net} /></td><td className={s.right}><Money value={slip.paid} /></td><td className={s.right}><Money value={slip.outstanding} /></td>
      </tr>
      {open === slip.id && <tr><td colSpan={heads.length} className={s.detailCell}><PayrollSlipDetail slipId={slip.id} /></td></tr>}
    </Fragment>)}</tbody>
  </table></div>;
}
