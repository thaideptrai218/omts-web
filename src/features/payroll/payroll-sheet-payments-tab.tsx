"use client";
import { useCallback, useState } from "react";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import type { PaymentRow } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, methodLabel, paymentStatusLabel } from "./payroll-model";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** Voucher codes stay plain text: the cash book screen does not take a search from the address yet. */
export const paymentColumns: readonly DataColumn<PaymentRow>[] = [
  { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> },
  { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) },
  { key: "employee", label: "Nhân viên", render: (row) => <a className={`${s.name} ${s.link}`} href={`/workspace/employees?recordId=${row.employeeId}&search=${encodeURIComponent(row.employeeName)}`}>{row.employeeName}</a> },
  { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method] },
  { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> },
  { key: "status", label: "Trạng thái", render: (row) => <StatusPill tone={row.status === "Cancelled" ? "danger" : "success"}>{paymentStatusLabel[row.status]}</StatusPill> },
];

/** Tab "Lịch sử thanh toán" of an open sheet (KiotViet): the payment vouchers made for this sheet, newest first, with their total. */
export function PayrollSheetPaymentsTab({ sheetId, paid }: { sheetId: string; paid: number }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.payments({ search: "", from: "", to: "", page, pageSize, payrollId: sheetId }, signal), [sheetId, page, pageSize]));
  const data = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !data) return <ListStateMessage error={remote.error ?? "Không tải được lịch sử thanh toán."} onRetry={remote.reload} retryLabel="Tải lại" />;
  // The query already carries `payrollId`; the filter below only guards the view against a backend that has not applied it yet.
  const rows = data.items.filter((row) => row.payrollId === sheetId);
  return <>
    <p className={s.summary} data-testid="payroll-sheet-payment-totals"><span>Số phiếu chi<strong>{data.total}</strong></span><span>Tổng đã trả nhân viên<strong><Money value={paid} /></strong></span></p>
    <div className={s.subTable}><PayrollDataTable caption="Lịch sử thanh toán của bảng lương" columns={paymentColumns} rows={rows} emptyText="Bảng lương chưa có thanh toán." /></div>
    <ManagementPagination page={data.page} pageSize={pageSize} total={data.total} unit="phiếu chi" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
  </>;
}
