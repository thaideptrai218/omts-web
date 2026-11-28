"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, kindLabel, rangeLabel } from "./payroll-model";
import { PayrollSlipDialog } from "./payroll-slip-detail";
import { SlipStatusPills } from "./payroll-slip-status";
import { payrollRepository } from "./repository";
import { usePayrollWriter } from "./use-payroll-writer";
import { WagePaymentCreateDialog, type WageSlipLine } from "./wage-payment-dialog";
import { WageVoucherDialog } from "./wage-voucher-dialog";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { EmployeeSlipRow, PaymentRow } from "./contracts";
import s from "./payroll-screen.module.css";

/** The most rows one read takes; the ledger covers that many payslips and payments. */
const LEDGER_READ = 100;

/** One line of the ledger: a finalized payslip adds to what the employee is owed, a payment or an advance takes it off. */
type LedgerRow = Readonly<{ id: string; at: number; time: string; code: string; type: string; value: number; balance: number; slip?: EmployeeSlipRow; payment?: PaymentRow }>;

/** Payslips and payments of one employee in time order, each with the balance after it (what is owed; below 0 is an advance not yet taken off a payslip). Newest first. */
export function buildLedger(slips: readonly EmployeeSlipRow[], payments: readonly PaymentRow[]): LedgerRow[] {
  const entries = [
    ...slips.map((slip) => ({ id: `slip-${slip.id}`, at: slip.finalizedAt ? Date.parse(slip.finalizedAt) : Date.parse(`${slip.to}T23:59:59+07:00`), time: slip.finalizedAt ? formatDateTime(slip.finalizedAt) : formatVietnameseDate(slip.to), code: slip.code, type: "Phiếu lương", value: slip.income, slip })),
    ...payments.filter((payment) => payment.status === "Recorded").map((payment) => ({ id: `pay-${payment.id}`, at: Date.parse(payment.paidAt), time: formatDateTime(payment.paidAt), code: payment.voucherCode, type: payment.kind === "Advance" ? kindLabel.Advance : "Thanh toán", value: -payment.amount, payment })),
  ].sort((a, b) => a.at - b.at || a.code.localeCompare(b.code));
  let balance = 0;
  return entries.map((entry) => ({ ...entry, balance: balance += entry.value })).reverse();
}

/** The "Nợ và tạm ứng" tab of an employee (KiotViet): payslips and payments with the running balance, the code of each opens it, and "Thanh toán" pays the employee. */
export function EmployeeDebtTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [paying, setPaying] = useState(false), writer = usePayrollWriter();
  const [slip, setSlip] = useState<EmployeeSlipRow>(), [voucher, setVoucher] = useState<PaymentRow>();
  const slips = useRemote(useCallback((signal: AbortSignal) => payrollRepository.employeeSlips(employeeId, { status: "Finalized", page: 1, pageSize: LEDGER_READ }, signal), [employeeId]));
  const payments = useRemote(useCallback((signal: AbortSignal) => payrollRepository.payments({ search: "", from: "", to: "", page: 1, pageSize: LEDGER_READ, employeeId }, signal), [employeeId]));
  const ledger = useMemo(() => buildLedger(slips.data?.items ?? [], payments.data?.items ?? []), [slips.data, payments.data]);
  const owing = useMemo<WageSlipLine[]>(() => [...(slips.data?.items ?? [])].filter((row) => row.outstanding > 0).sort((a, b) => a.to.localeCompare(b.to) || a.code.localeCompare(b.code))
    .map((row) => ({ id: row.id, code: row.code, time: rangeLabel(row.from, row.to), value: row.net, paidBefore: row.paid, remaining: row.outstanding })), [slips.data]);
  if (slips.loading || payments.loading) return <Skeleton />;
  const failure = slips.error ?? payments.error;
  if (failure || !slips.data || !payments.data) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { slips.reload(); payments.reload(); }} retryLabel="Tải lại" />;
  const columns: readonly DataColumn<LedgerRow>[] = [
    { key: "code", label: "Mã phiếu", render: (row) => <button type="button" className={s.codeButton} onClick={() => row.slip ? setSlip(row.slip) : setVoucher(row.payment)}>{row.code}</button> },
    { key: "time", label: "Thời gian", render: (row) => row.time }, { key: "type", label: "Loại phiếu", render: (row) => row.type },
    { key: "status", label: "Trạng thái", render: (row) => row.slip ? <SlipStatusPills status={row.slip.status} net={row.slip.net} paid={row.slip.paid} /> : "" },
    { key: "value", label: "Giá trị", right: true, render: (row) => <Money value={row.value} /> }, { key: "balance", label: "Nợ và tạm ứng", right: true, render: (row) => <Money value={row.balance} /> },
  ];
  const rows = ledger.slice((page - 1) * pageSize, page * pageSize);
  return <div className={s.tabBody}>
    <p className={s.summary}><span>Nợ cần trả<strong><Money value={slips.data.summary.outstanding} /></strong></span><span>Tạm ứng đã chi<strong><Money value={slips.data.summary.advanceBalance} /></strong></span></p>
    <div className={s.subTable}><PayrollDataTable caption="Nợ và tạm ứng của nhân viên" columns={columns} rows={rows} emptyText="Chưa có phiếu lương đã chốt, thanh toán hoặc tạm ứng." /></div>
    <ManagementPagination page={page} pageSize={pageSize} total={ledger.length} unit="phiếu" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
    {writer && <footer className={s.footer}><div /><div><Button key="pay" className="w-auto" type="button" onClick={() => setPaying(true)}><InterfaceIcon name="payment" className="size-4" />Thanh toán</Button></div></footer>}
    {paying && <WagePaymentCreateDialog target={{ kind: "employee", employeeId, name: employeeName }} slips={owing} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); slips.reload(); payments.reload(); }} />}
    {slip && <PayrollSlipDialog slipId={slip.id} code={slip.code} onClose={() => setSlip(undefined)} />}
    {voucher && <WageVoucherDialog voucher={voucher} onClose={(changed) => { setVoucher(undefined); if (changed) { slips.reload(); payments.reload(); } }} />}
  </div>;
}
