"use client";
import { EmployeeKindBadgeById } from "@/features/employee-api/employee-kind-badge-by-id";
import { useCallback, useId, useState } from "react";
import { ExportMenu } from "@/components/ui/export-menu";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { ErrorNotice, Money, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import type { PaymentMethod } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, formatHours, kindLabel, methodLabel, paymentStatusLabel } from "./payroll-model";
import { PayrollSlipAttendanceTable } from "./payroll-slip-attendance-table";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

export type SlipTab = "payments" | "attendance";
const tabs = [{ key: "payments" as const, label: "Thanh toán" }, { key: "attendance" as const, label: "Chấm công chi tiết" }];

/**
 * The open payslip (KiotViet section 7): the income lines (hours × rate) with the deductions on top, then the tabs "Thanh toán" (payments of this slip) and
 * "Chấm công chi tiết" (the days behind the hours). "Tải xuống" gives the printable payslip as PDF or Excel.
 */
export function PayrollSlipDetail({ slipId, initialTab = "payments" }: { slipId: string; initialTab?: SlipTab }) {
  const [tab, setTab] = useState<SlipTab>(initialTab), prefix = useId(), file = useMutation();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.slip(slipId, signal), [slipId]));
  const slip = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !slip) return <ListStateMessage error={remote.error ?? "Không tải được phiếu lương."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const lines: DataColumn<(typeof slip.lines)[number] & { id: string }>[] = [
    { key: "job", label: "Công việc", render: (line) => line.jobName }, { key: "hours", label: "Giờ công", right: true, render: (line) => formatHours(line.hours) },
    { key: "rate", label: "Đơn giá", right: true, render: (line) => <Money value={line.hourlyRate} /> }, { key: "amount", label: "Thành tiền", right: true, render: (line) => <Money value={line.amount} /> },
  ];
  const payments: DataColumn<(typeof slip.payments)[number]>[] = [
    { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> }, { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) },
    { key: "kind", label: "Loại", render: (row) => kindLabel[row.kind] }, { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method as PaymentMethod] },
    { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> }, { key: "status", label: "Trạng thái", render: (row) => paymentStatusLabel[row.status] },
  ];
  return <section aria-label={`Chi tiết phiếu lương ${slip.code}`} className={s.slipDetail}>
    <div className={s.slipHead}>
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{slip.code} · {slip.employeeName}<EmployeeKindBadgeById employeeId={slip.employeeId} /></strong>
        <ExportMenu pending={file.pending} onPick={(format) => void file.run(() => payrollRepository.exportSlip(slip.id, format), true)} /></div>
      <ErrorNotice error={file.error} />
      <div className={s.subTable}><PayrollDataTable caption="Thu nhập theo công việc" columns={lines} rows={slip.lines.map((line, index) => ({ ...line, id: String(index) }))} emptyText="Phiếu lương chưa có dòng thu nhập." /></div>
      <dl className={s.facts}>
        {([["Lương chính", slip.mainPay], ["Thưởng/Phụ cấp", slip.bonus], ["Tổng thu nhập", slip.income], ["Tạm ứng trừ", slip.deduction], ["Thực lĩnh", slip.net], ["Đã trả", slip.paid], ["Còn cần trả", slip.outstanding]] as const)
          .map(([label, value]) => <div key={label}><dt>{label}</dt><dd><Money value={value} /></dd></div>)}
      </dl>
    </div>
    <Subtabs<SlipTab> label="Nội dung phiếu lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} className={s.tabBody}>
      {tab === "payments"
        ? <div className={s.subTable}><PayrollDataTable caption="Thanh toán của phiếu lương" columns={payments} rows={slip.payments} emptyText="Chưa có thanh toán." /></div>
        : <div className={s.subTable}><PayrollSlipAttendanceTable days={slip.attendance} /></div>}
    </div>
  </section>;
}