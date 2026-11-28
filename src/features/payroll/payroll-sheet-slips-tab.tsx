"use client";
import { EmployeeKindBadgeById } from "@/features/employee-api/employee-kind-badge-by-id";
import { salaryTypeLabel } from "@/features/employee-api/employee-salary-model";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { Money } from "@/features/operations/ui";
import type { SheetDetail, Slip } from "./contracts";
import { rangeLabel } from "./payroll-model";
import { PayrollSlipDialog } from "./payroll-slip-detail";
import { SlipStatusPills } from "./payroll-slip-status";
import { usePayrollWriter } from "./use-payroll-writer";
import { WagePaymentCreateDialog } from "./wage-payment-dialog";
import s from "./payroll-screen.module.css";

const heads: readonly [string, boolean][] = [["Mã phiếu", false], ["Tên nhân viên", false], ["Loại lương", false], ["Tổng lương", true], ["Còn cần trả", true], ["Trạng thái", false]];
/** Tổng lương: main pay, shift pay and bonus less the manual deduction, before the advance deduction (the same figure as the employee's Phiếu lương tab). */
const grossOf = (slip: Slip) => slip.income;
const sum = (slips: readonly Slip[], pick: (slip: Slip) => number) => slips.reduce((total, slip) => total + pick(slip), 0);
/** Where the salary of an employee is set: the employee list opened on that employee, whose "Thiết lập lương" tab holds the setup. */
const salarySetupHref = (slip: Pick<Slip, "employeeId" | "employeeName">) => `/workspace/employees?recordId=${slip.employeeId}&search=${encodeURIComponent(slip.employeeName)}`;

/**
 * Tab "Phiếu lương" of an open sheet: a compact list, a totals row on top, then one row per payslip with its code, the employee, the salary type, the total pay before deductions
 * and what is still owed. The code opens "Phiếu lương cá nhân" (the money column, payments, attendance, thưởng / khấu trừ). "Thanh toán" of a finalized sheet
 * pays its payslips. `onChanged` tells the sheet to read itself again after a payslip or a payment changed its totals.
 */
export function PayrollSheetSlipsTab({ sheet, onChanged }: { sheet: SheetDetail; onChanged?(): void }) {
  const [open, setOpen] = useState<{ id: string; code: string }>(), [paying, setPaying] = useState(false), writer = usePayrollWriter();
  const slips = sheet.slips;
  const canPay = writer && sheet.status === "Finalized";
  return <><div className={s.subTable}><table className={s.table}>
    <caption className="sr-only">Phiếu lương</caption>
    <thead>
      <tr>{heads.map(([label, right]) => <th key={label} scope="col" className={right ? s.right : undefined}>{label}</th>)}</tr>
      <tr className={s.totalRow} data-testid="payroll-slips-total"><th scope="row" colSpan={3}>Tổng ({slips.length} nhân viên)</th>
        <td className={s.right}><Money value={sum(slips, grossOf)} /></td><td className={s.right}><Money value={sum(slips, (slip) => slip.outstanding)} /></td><td /></tr>
    </thead>
    <tbody>{slips.length === 0 ? <tr><td colSpan={heads.length} className={s.emptyCell}>Bảng lương chưa có phiếu lương.</td></tr> : slips.map((slip) => <tr key={slip.id}>
        <td><button type="button" className={s.codeButton} onClick={() => setOpen({ id: slip.id, code: slip.code })}>{slip.code}</button></td>
        <td><a className={`${s.name} ${s.link}`} href={`/workspace/employees?recordId=${slip.employeeId}&search=${encodeURIComponent(slip.employeeName)}`}>{slip.employeeName}</a><EmployeeKindBadgeById employeeId={slip.employeeId} /></td>
        <td>{slip.salaryType ? salaryTypeLabel(slip.salaryType) : <a className={s.link} href={salarySetupHref(slip)}>Chưa thiết lập lương</a>}</td>
        <td className={s.right}><Money value={grossOf(slip)} /></td><td className={s.right}><Money value={slip.outstanding} /></td>
        <td><SlipStatusPills status={sheet.status} net={slip.net} paid={slip.paid} /></td>
      </tr>)}</tbody>
  </table></div>
  {canPay && <footer className={s.footer}><div /><div><Button key="pay" className="w-auto" type="button" disabled={sheet.outstanding <= 0} title={sheet.outstanding <= 0 ? "Không còn khoản cần trả" : undefined} onClick={() => setPaying(true)}><InterfaceIcon name="payment" className="size-4" />Thanh toán</Button></div></footer>}
  {open && <PayrollSlipDialog key={open.id} slipId={open.id} code={open.code} onSheetChanged={onChanged} onClose={() => setOpen(undefined)} />}
  {paying && <WagePaymentCreateDialog target={{ kind: "sheet", sheetId: sheet.id, label: `${sheet.code} · ${sheet.name}` }} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); onChanged?.(); }}
    slips={slips.map((slip) => ({ id: slip.id, code: slip.code, employeeName: slip.employeeName, time: rangeLabel(sheet.from, sheet.to), value: slip.net, paidBefore: slip.paid, remaining: slip.outstanding }))} />}</>;
}
