"use client";
import { EmployeeKindBadgeById } from "@/features/employee-api/employee-kind-badge-by-id";
import { salaryTypeLabel } from "@/features/employee-api/employee-salary-model";
import { useCallback, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { ErrorNotice, Money, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import type { PaymentRow, SlipDetail } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, formatHours, formatShifts, kindLabel, lineKindLabel, methodLabel, paymentStatusLabel, rangeLabel, sheetHref } from "./payroll-model";
import { AdjustmentsButton, PayrollAdjustmentsDialog, PayrollSlipAdjustmentList } from "./payroll-slip-adjustments";
import { PayrollSlipAttendanceTable } from "./payroll-slip-attendance-table";
import { SlipStatusPills } from "./payroll-slip-status";
import { payrollRepository } from "./repository";
import { usePayrollOwner } from "./use-payroll-writer";
import { WageVoucherDialog } from "./wage-voucher-dialog";
import s from "./payroll-screen.module.css";

export type SlipTab = "payments" | "attendance";
const tabs = [{ key: "payments" as const, label: "Thanh toán" }, { key: "attendance" as const, label: "Chấm công chi tiết" }];

/** One row of "Thu nhập theo công việc": the fixed monthly salary, or a job paid by the hour or the shift. */
type IncomeRow = { id: string; what: string; kind: string; quantity: string; rate: ReactNode; amount: number };
export function incomeRows(slip: Pick<SlipDetail, "lines" | "fixedPay">): IncomeRow[] {
  const fixed: IncomeRow[] = slip.fixedPay > 0 ? [{ id: "fixed", what: "Lương cố định tháng", kind: "Cố định tháng", quantity: "—", rate: "—", amount: slip.fixedPay }] : [];
  return [...fixed, ...slip.lines.map((line, index): IncomeRow => line.kind === "Hourly"
    ? { id: String(index), what: line.jobName, kind: lineKindLabel.Hourly, quantity: formatHours(line.hours), rate: <><Money value={line.hourlyRate} />/giờ</>, amount: line.amount }
    : { id: String(index), what: line.jobName, kind: lineKindLabel[line.kind], quantity: formatShifts(line.shifts), rate: <><Money value={line.shiftRate} />/ca</>, amount: line.amount })];
}

type MoneyRow = readonly [label: string, value: number, weight?: "total" | "sub", hint?: string, editable?: boolean];
const adjustmentsNote = "Thưởng/khấu trừ chỉ áp dụng cho nhân viên nội bộ.";

/**
 * The open payslip, laid out like the KiotViet "Phiếu lương cá nhân": the tabs "Thanh toán" (the facts on the left, the money column on the right, the income lines, the
 * Thưởng / Khấu trừ rows of an internal employee and the payments of this slip) and "Chấm công chi tiết" (the days behind the hours and shifts); "Xuất file" gives the printable payslip.
 * `onSheetChanged` tells the sheet that opened it to read itself again after the adjustments changed its totals; `onClose` adds "Bỏ qua" to the footer;
 * `initialEdit` opens the Thưởng / Khấu trừ popup at once.
 */
export function PayrollSlipDetail({ slipId, initialTab = "payments", initialEdit = false, onSheetChanged, onClose }: { slipId: string; initialTab?: SlipTab; initialEdit?: boolean; onSheetChanged?(): void; onClose?(): void }) {
  const [editing, setEditing] = useState(initialEdit), [tab, setTab] = useState<SlipTab>(initialTab), [voucher, setVoucher] = useState<PaymentRow>(), prefix = useId(), file = useMutation(), writer = usePayrollOwner();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.slip(slipId, signal), [slipId]));
  const slip = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !slip) return <ListStateMessage error={remote.error ?? "Không tải được phiếu lương."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const lines: DataColumn<IncomeRow>[] = [
    { key: "job", label: "Công việc", render: (line) => line.what }, { key: "kind", label: "Hình thức", render: (line) => line.kind },
    { key: "quantity", label: "Giờ / ca", right: true, render: (line) => line.quantity },
    { key: "rate", label: "Đơn giá", right: true, render: (line) => line.rate }, { key: "amount", label: "Thành tiền", right: true, render: (line) => <Money value={line.amount} /> },
  ];
  const asVoucher = (row: (typeof slip.payments)[number]): PaymentRow => ({ ...row, employeeId: slip.employeeId, employeeName: slip.employeeName, payrollId: slip.payrollId, payrollCode: slip.payrollCode });
  const payments: DataColumn<(typeof slip.payments)[number]>[] = [
    { key: "code", label: "Mã phiếu chi", render: (row) => <button type="button" className={s.linkButton} onClick={() => setVoucher(asVoucher(row))}>{row.voucherCode}</button> },
    { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) }, { key: "kind", label: "Loại", render: (row) => kindLabel[row.kind] },
    { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method] }, { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> },
    { key: "status", label: "Trạng thái", render: (row) => paymentStatusLabel[row.status] },
  ];
  const facts: readonly (readonly [string, ReactNode])[] = [
    [slip.employeeCode ?? "Nhân viên", <span key="name"><strong>{slip.employeeName}</strong><EmployeeKindBadgeById employeeId={slip.employeeId} /></span>],
    ["Loại lương chính", salaryTypeLabel(slip.salaryType)], ["Trạng thái", <SlipStatusPills key="status" status={slip.status} net={slip.net} paid={slip.paid} />],
    ["Bảng lương", <a key="sheet" className={s.link} href={sheetHref(slip.payrollId, slip.payrollCode)}>{slip.payrollCode}</a>], ["Kỳ làm việc", rangeLabel(slip.from, slip.to)],
    ["Giờ công", formatHours(slip.hours)], ["Số ca", formatShifts(slip.shifts)],
  ];
  const provisional = slip.status === "Provisional", editable = writer && provisional && slip.allowsAdjustments;
  // Thưởng and Khấu trừ stay two rows; the advance is its own row, "(dự kiến)" until the sheet is finalized and the advances are really taken off.
  const money: readonly MoneyRow[] = [
    ["Lương chính", slip.mainPay], ["Tiền ca", slip.shiftPay], ["Thưởng", slip.bonus, undefined, undefined, editable], ["Khấu trừ", slip.manualDeduction, undefined, undefined, editable],
    [provisional ? "Trừ tạm ứng (dự kiến)" : "Trừ tạm ứng", slip.advanceDeduction], ["Thực nhận", slip.net, "total", "= Lương chính + Tiền ca + Thưởng − Khấu trừ − Trừ tạm ứng"],
    ["Đã trả", slip.paid], ["Còn cần trả", slip.outstanding, "total"],
  ];
  return <section aria-label={`Chi tiết phiếu lương ${slip.code}`}>
    <Subtabs<SlipTab> label="Nội dung phiếu lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} className={s.tabBody}>
      {tab === "payments" ? <>
        <div className={s.slipTop}>
          <dl className={s.slipFacts}>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <dl className={s.slipMoney}>{money.map(([label, value, weight, hint, edit]) => <div key={label} data-weight={weight}><dt>{label}{edit && <AdjustmentsButton label={`Sửa ${label.toLowerCase()} của ${slip.code}`} onClick={() => setEditing(true)} />}{hint && <small>{hint}</small>}</dt><dd><Money value={value} /></dd></div>)}</dl>
        </div>
        <h4 className={s.sectionTitle}>Thu nhập theo công việc</h4>
        <div className={s.subTable}><PayrollDataTable caption="Thu nhập theo công việc" columns={lines} rows={incomeRows(slip)} emptyText="Phiếu lương chưa có dòng thu nhập." /></div>
        {writer && provisional && !slip.allowsAdjustments ? <p className={s.muted}>{adjustmentsNote}</p> : <PayrollSlipAdjustmentList slip={slip} />}
        <h4 className={s.sectionTitle}>Thanh toán của phiếu lương</h4>
        <div className={s.subTable}><PayrollDataTable caption="Thanh toán của phiếu lương" columns={payments} rows={slip.payments} emptyText="Chưa có thanh toán." /></div>
      </> : <div className={s.subTable}><PayrollSlipAttendanceTable days={slip.attendance} /></div>}
    </div>
    <ErrorNotice error={file.error} />
    <footer className={s.footer}><div /><div>
      {onClose && <Button className="w-auto" variant="secondary" type="button" onClick={onClose}>Bỏ qua</Button>}
      <ExportMenu pending={file.pending} onPick={(format) => void file.run(() => payrollRepository.exportSlip(slip.id, format), true)} />
    </div></footer>
    {editing && editable && <PayrollAdjustmentsDialog slip={slip} onClose={() => setEditing(false)} onSaved={() => { remote.refresh(); onSheetChanged?.(); }} />}
    {voucher && <WageVoucherDialog voucher={voucher} onClose={(changed) => { setVoucher(undefined); if (changed) { remote.reload(); onSheetChanged?.(); } }} />}
  </section>;
}

/** "Phiếu lương cá nhân PL…" as a dialog; opened from a payslip code on the sheet, the employee tabs and the debt ledger. */
export function PayrollSlipDialog({ slipId, code, initialTab, initialEdit, onClose, onSheetChanged }: { slipId: string; code: string; initialTab?: SlipTab; initialEdit?: boolean; onClose(): void; onSheetChanged?(): void }) {
  return <Dialog open size="xl" title={`Phiếu lương cá nhân ${code}`} onOpenChange={(open) => { if (!open) onClose(); }}><PayrollSlipDetail slipId={slipId} initialTab={initialTab} initialEdit={initialEdit} onSheetChanged={onSheetChanged} onClose={onClose} /></Dialog>;
}
