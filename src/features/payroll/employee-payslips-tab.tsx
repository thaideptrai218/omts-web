"use client";
import { useCallback, useState } from "react";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { SelectBox } from "@/components/ui/select-box";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import type { EmployeeSlipRow, PayrollStatus } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { rangeLabel } from "./payroll-model";
import { PayrollSlipDialog } from "./payroll-slip-detail";
import { SlipStatusPills } from "./payroll-slip-status";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

/** The status filter of the tab, as in KiotViet: all, provisional, finalized, cancelled. */
const filters: readonly (readonly [PayrollStatus | "", string])[] = [["", "Tất cả"], ["Provisional", "Tạm tính"], ["Finalized", "Đã chốt lương"], ["Cancelled", "Đã hủy"]];

/** The "Phiếu lương" tab of an employee (KiotViet): a status filter and one row per payslip; its code opens "Phiếu lương cá nhân" as a dialog. */
export function EmployeePayslipsTab({ employeeId }: { employeeId: string }) {
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [status, setStatus] = useState<PayrollStatus | "">(""), [open, setOpen] = useState<EmployeeSlipRow>();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.employeeSlips(employeeId, { status: status || undefined, page, pageSize }, signal), [employeeId, status, page, pageSize]));
  const data = remote.data;
  if (remote.loading && !data) return <Skeleton />;
  if (remote.error || !data) return <ListStateMessage error={remote.error ?? "Không tải được phiếu lương."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const columns: readonly DataColumn<EmployeeSlipRow>[] = [
    { key: "code", label: "Mã phiếu", render: (row) => <button type="button" className={s.codeButton} onClick={() => setOpen(row)}>{row.code}</button> },
    { key: "period", label: "Kỳ làm việc", render: (row) => rangeLabel(row.from, row.to) },
    // Tổng lương is the income before the advance deduction, as on the payroll sheet; the advance shows on its own so Còn cần trả adds up.
    { key: "income", label: "Tổng lương", right: true, render: (row) => <Money value={row.income} /> },
    { key: "advance", label: "Trừ tạm ứng", right: true, render: (row) => <Money value={Math.max(row.income - row.net, 0)} /> },
    { key: "paid", label: "Đã trả", right: true, render: (row) => <Money value={row.paid} /> },
    { key: "outstanding", label: "Còn cần trả", right: true, render: (row) => <Money value={row.outstanding} /> },
    { key: "status", label: "Trạng thái", render: (row) => <SlipStatusPills status={row.status} net={row.net} paid={row.paid} /> },
  ];
  return <div className={s.tabBody}>
    <div className="mb-3 w-56"><SelectBox aria-label="Lọc phiếu lương theo trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as PayrollStatus | ""); setPage(1); }}>
      {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </SelectBox></div>
    <div className={s.subTable}><PayrollDataTable caption="Phiếu lương của nhân viên" columns={columns} rows={data.items} emptyText="Nhân viên chưa có phiếu lương." /></div>
    <ManagementPagination page={data.page} pageSize={pageSize} total={data.total} unit="phiếu lương" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} />
    {open && <PayrollSlipDialog slipId={open.id} code={open.code} onClose={() => setOpen(undefined)} onSheetChanged={remote.refresh} />}
  </div>;
}
