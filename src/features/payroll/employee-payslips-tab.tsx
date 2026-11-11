"use client";
import { Fragment, useCallback, useState } from "react";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import type { EmployeeSlipRow } from "./contracts";
import { rangeLabel, statusLabel, statusTone } from "./payroll-model";
import { PayrollSlipDetail } from "./payroll-slip-detail";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** Link to the payroll sheet, opened on that sheet in the Bảng lương screen. */
export const sheetHref = (payrollId: string, code: string) => `/operations/payroll?recordId=${payrollId}&search=${encodeURIComponent(code)}`;
export function SheetLink({ row }: { row: Pick<EmployeeSlipRow, "payrollId" | "payrollCode" | "payrollName"> }) {
  return <a className={s.link} href={sheetHref(row.payrollId, row.payrollCode)}>{row.payrollCode} · {row.payrollName}</a>;
}

/** The "Phiếu lương" tab of an employee (KiotViet section 7): clicking a payslip code opens its detail under the row. */
export function EmployeePayslipsTab({ employeeId }: { employeeId: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15), [open, setOpen] = useState<string>();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.employeeSlips(employeeId, { page, pageSize }, signal), [employeeId, page, pageSize]));
  const data = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu lương."} onRetry={remote.reload} retryLabel="Tải lại" />;
  if (!data.items.length) return <ListStateMessage>Nhân viên chưa có phiếu lương.</ListStateMessage>;
  return <div className={s.tabBody}>
    <div className={s.subTable}><table className={s.table}>
      <caption className="sr-only">Phiếu lương của nhân viên</caption>
      <thead><tr><th scope="col">Mã phiếu lương</th><th scope="col">Bảng lương</th><th scope="col">Kỳ làm việc</th><th scope="col" className={s.right}>Tổng thu nhập</th><th scope="col" className={s.right}>Lương thực nhận</th>
        <th scope="col" className={s.right}>Đã trả</th><th scope="col" className={s.right}>Còn cần trả</th><th scope="col">Trạng thái</th></tr></thead>
      <tbody>{data.items.map((row) => <Fragment key={row.id}>
        <tr data-selected={open === row.id || undefined}>
          <td><button type="button" className={s.codeButton} aria-expanded={open === row.id} onClick={() => setOpen((value) => value === row.id ? undefined : row.id)}>{row.code}</button></td>
          <td><SheetLink row={row} /></td><td>{rangeLabel(row.from, row.to)}</td>
          <td className={s.right}><Money value={row.income} /></td><td className={s.right}><Money value={row.net} /></td><td className={s.right}><Money value={row.paid} /></td><td className={s.right}><Money value={row.outstanding} /></td>
          <td><StatusPill tone={statusTone(row.status)}>{statusLabel[row.status]}</StatusPill></td>
        </tr>
        {open === row.id && <tr><td colSpan={8} className={s.detailCell}><PayrollSlipDetail slipId={row.id} /></td></tr>}
      </Fragment>)}</tbody>
    </table></div>
    <ManagementPagination page={data.page} pageSize={pageSize} total={data.total} unit="phiếu lương" onPage={(next) => { setOpen(undefined); setPage(next); }} onPageSize={(size) => { setOpen(undefined); setPageSize(size); setPage(1); }} />
  </div>;
}
