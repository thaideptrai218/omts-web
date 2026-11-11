"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import { SheetLink, sheetHref } from "./employee-payslips-tab";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, kindLabel, methodLabel, paymentStatusLabel, rangeLabel } from "./payroll-model";
import { StandalonePaymentDialog } from "./payroll-standalone-payment-dialog";
import { payrollRepository } from "./repository";
import type { EmployeeSlipRow, PaymentRow } from "./contracts";
import s from "./payroll-screen.module.css";

const slipColumns: readonly DataColumn<EmployeeSlipRow>[] = [
  { key: "code", label: "Mã phiếu lương", render: (row) => <span className={s.mono}>{row.code}</span> }, { key: "sheet", label: "Bảng lương", render: (row) => <SheetLink row={row} /> },
  { key: "period", label: "Kỳ làm việc", render: (row) => rangeLabel(row.from, row.to) }, { key: "net", label: "Lương thực nhận", right: true, render: (row) => <Money value={row.net} /> },
  { key: "paid", label: "Đã trả", right: true, render: (row) => <Money value={row.paid} /> }, { key: "outstanding", label: "Còn cần trả", right: true, render: (row) => <Money value={row.outstanding} /> },
];
const paymentColumns: readonly DataColumn<PaymentRow>[] = [
  { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) }, { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> },
  { key: "kind", label: "Loại", render: (row) => kindLabel[row.kind] }, { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method] },
  { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> },
  { key: "sheet", label: "Bảng lương", render: (row) => row.payrollId && row.payrollCode ? <a className={s.link} href={sheetHref(row.payrollId, row.payrollCode)}>{row.payrollCode}</a> : "—" },
  { key: "status", label: "Trạng thái", render: (row) => paymentStatusLabel[row.status] },
];

/** The "Nợ và tạm ứng" tab of an employee: debt and advance totals, finalized payslips, payments made, and "Thanh toán lương". */
export function EmployeeDebtTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [paying, setPaying] = useState(false), [notice, setNotice] = useState<string>();
  const slips = useRemote(useCallback((signal: AbortSignal) => payrollRepository.employeeSlips(employeeId, { status: "Finalized", page: 1, pageSize: 100 }, signal), [employeeId]));
  const payments = useRemote(useCallback((signal: AbortSignal) => payrollRepository.payments({ search: "", from: "", to: "", page, pageSize, employeeId }, signal), [employeeId, page, pageSize]));
  const owed = slips.data?.summary.outstanding;
  const payee = useMemo(() => owed === undefined ? undefined : { employeeId, code: "", name: employeeName, outstanding: owed }, [employeeId, employeeName, owed]);
  if (slips.loading || payments.loading) return <Skeleton />;
  const failure = slips.error ?? payments.error;
  if (failure || !slips.data || !payments.data || !payee) return <ListStateMessage error={failure ?? "Không tải được dữ liệu."} onRetry={() => { slips.reload(); payments.reload(); }} retryLabel="Tải lại" />;
  return <div className={s.tabBody}>
    <p className={s.summary}><span>Nợ cần trả<strong><Money value={slips.data.summary.outstanding} /></strong></span><span>Tạm ứng đã chi<strong><Money value={slips.data.summary.advanceBalance} /></strong></span></p>
    {notice && <p role="status">{notice}</p>}
    <h4 className={s.sectionTitle}>Phiếu lương đã chốt</h4>
    <div className={s.subTable}><PayrollDataTable caption="Phiếu lương đã chốt" columns={slipColumns} rows={slips.data.items} emptyText="Chưa có phiếu lương đã chốt." /></div>
    <h4 className={s.sectionTitle}>Lịch sử thanh toán và tạm ứng</h4>
    <div className={s.subTable}><PayrollDataTable caption="Thanh toán và tạm ứng của nhân viên" columns={paymentColumns} rows={payments.data.items} emptyText="Chưa có thanh toán hoặc tạm ứng." /></div>
    <ManagementPagination page={payments.data.page} pageSize={pageSize} total={payments.data.total} unit="phiếu chi" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
    <footer className={s.footer}><div /><div><Button key="pay" className="w-auto" type="button" onClick={() => setPaying(true)}><InterfaceIcon name="payment" className="size-4" />Thanh toán lương</Button></div></footer>
    {paying && <StandalonePaymentDialog employee={payee} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); setNotice("Đã tạo phiếu chi. Phiếu chi xuất hiện trong Sổ quỹ."); slips.reload(); payments.reload(); }} />}
  </div>;
}
