"use client";
import { useCallback, useId, useState } from "react";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { PaymentMethod } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatDateTime, kindLabel, methodLabel, paymentStatusLabel } from "./payroll-model";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

type Tab = "income" | "payments" | "attendance";
const tabs = [{ key: "income" as const, label: "Thu nhập và giảm trừ" }, { key: "payments" as const, label: "Thanh toán" }, { key: "attendance" as const, label: "Chấm công chi tiết" }];
type Row<T> = T & { id: string };
const withId = <T,>(rows: readonly T[]): Row<T>[] => rows.map((row, index) => ({ ...row, id: String(index) }));

/** The open payslip (KiotViet section 7): income lines (hours × rate), deductions, the payments of this slip and the attendance of the period. */
export function PayrollSlipDetail({ slipId }: { slipId: string }) {
  const [tab, setTab] = useState<Tab>("income"), prefix = useId();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.slip(slipId, signal), [slipId]));
  const slip = remote.data;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !slip) return <ListStateMessage error={remote.error ?? "Không tải được phiếu lương."} onRetry={remote.reload} retryLabel="Tải lại" />;
  const lines: DataColumn<Row<(typeof slip.lines)[number]>>[] = [
    { key: "job", label: "Công việc", render: (line) => line.jobName }, { key: "hours", label: "Giờ công", right: true, render: (line) => line.hours },
    { key: "rate", label: "Đơn giá", right: true, render: (line) => <Money value={line.hourlyRate} /> }, { key: "amount", label: "Thành tiền", right: true, render: (line) => <Money value={line.amount} /> },
  ];
  const payments: DataColumn<Row<(typeof slip.payments)[number]>>[] = [
    { key: "code", label: "Mã phiếu chi", render: (row) => <span className={s.mono}>{row.voucherCode}</span> }, { key: "time", label: "Thời gian", render: (row) => formatDateTime(row.paidAt) },
    { key: "kind", label: "Loại", render: (row) => kindLabel[row.kind] }, { key: "method", label: "Phương thức", render: (row) => methodLabel[row.method as PaymentMethod] },
    { key: "amount", label: "Số tiền", right: true, render: (row) => <Money value={row.amount} /> }, { key: "status", label: "Trạng thái", render: (row) => paymentStatusLabel[row.status] },
  ];
  const attendance: DataColumn<Row<(typeof slip.attendance)[number]>>[] = [
    { key: "date", label: "Ngày", render: (row) => formatVietnameseDate(row.date) }, { key: "job", label: "Công việc", render: (row) => row.jobName }, { key: "hours", label: "Giờ công", right: true, render: (row) => row.hours },
  ];
  return <section aria-label={`Chi tiết phiếu lương ${slip.code}`} className={s.slipDetail}>
    <Subtabs<Tab> label="Nội dung phiếu lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} className={s.tabBody}>
      {tab === "income" && <>
        <div className={s.subTable}><PayrollDataTable caption="Thu nhập theo công việc" columns={lines} rows={withId(slip.lines)} emptyText="Phiếu lương chưa có dòng thu nhập." /></div>
        <dl className={`${s.facts} mt-3`}>
          {([["Lương chính", slip.mainPay], ["Thưởng", slip.bonus], ["Tổng thu nhập", slip.income], ["Giảm trừ và tạm ứng", slip.deduction], ["Lương thực nhận", slip.net], ["Đã trả", slip.paid], ["Còn cần trả", slip.outstanding]] as const)
            .map(([label, value]) => <div key={label}><dt>{label}</dt><dd><Money value={value} /></dd></div>)}
        </dl></>}
      {tab === "payments" && <div className={s.subTable}><PayrollDataTable caption="Thanh toán của phiếu lương" columns={payments} rows={slip.payments} emptyText="Chưa có thanh toán." /></div>}
      {tab === "attendance" && <div className={s.subTable}><PayrollDataTable caption="Chấm công chi tiết" columns={attendance} rows={withId(slip.attendance)} emptyText="Không có chấm công trong kỳ." /></div>}
    </div>
  </section>;
}
