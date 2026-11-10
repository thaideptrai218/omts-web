"use client";
import { useId, useState, type ReactNode } from "react";
import { Subtabs } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { payrollStatusLabel, type PayrollLaborCost, type PayrollPayment, type PayrollSheet, type PayrollSlip } from "./payroll-model";
import { payrollStatusTone } from "./payroll-sheet-columns";
import s from "./payroll-screen.module.css";

type Tab = "info" | "slips" | "labor" | "payments";
const tabs = [
  { key: "info" as const, label: "Thông tin" }, { key: "slips" as const, label: "Phiếu lương" },
  { key: "labor" as const, label: "Chi phí nhân công theo bè" }, { key: "payments" as const, label: "Lịch sử thanh toán" },
];

const slipColumns: readonly DataColumn<PayrollSlip>[] = [
  { key: "employee", label: "Nhân viên", render: (slip) => <span className={s.name}>{slip.employeeName}</span> },
  { key: "type", label: "Loại nhân viên", render: (slip) => slip.employeeType },
  { key: "hours", label: "Giờ × đơn giá", render: (slip) => slip.workLines.length ? slip.workLines.map((line) => <div key={line.jobName}>{line.jobName}: {line.hours} giờ × <Money value={line.hourlyRate} /></div>) : "—" },
  { key: "subtotal", label: "Cộng", right: true, render: (slip) => <Money value={slip.subtotal} /> },
  { key: "adjustment", label: "Điều chỉnh và lý do", render: (slip) => slip.adjustment === null ? "—" : <><Money value={slip.adjustment} /> · {slip.adjustmentReason}</> },
  { key: "net", label: "Lương", right: true, render: (slip) => <Money value={slip.net} /> },
];
const laborColumns: readonly DataColumn<PayrollLaborCost>[] = [
  { key: "raft", label: "Bè", render: (cost) => <span className={s.name}>{cost.raftName}</span> },
  { key: "zone", label: "Vùng", render: (cost) => cost.zoneName },
  { key: "cycle", label: "Chu kỳ", render: (cost) => cost.cycleName },
  { key: "cost", label: "Chi phí", right: true, render: (cost) => <Money value={cost.cost} /> },
];
const paymentColumns: readonly DataColumn<PayrollPayment>[] = [
  { key: "code", label: "Mã phiếu chi", render: (payment) => <span className={s.name}>{payment.voucherCode}</span> },
  { key: "employee", label: "Nhân viên", render: (payment) => payment.employeeName },
  { key: "date", label: "Ngày", render: (payment) => formatVietnameseDate(payment.paidOn) },
  { key: "amount", label: "Số tiền", right: true, render: (payment) => <Money value={payment.amount} /> },
  { key: "method", label: "Phương thức", render: (payment) => payment.method },
  { key: "status", label: "Trạng thái", render: (payment) => payment.status },
];

/**
 * The open row of Bảng lương: four subtabs, all stay mounted. Only reachable from a row of the list, so it is only seen
 * once sheets exist. Tab footers (secondary actions left, primary/state actions right) are intentionally absent: the
 * actions (send to owner, adjust a line, cancel/record a payment) arrive together with their API contract.
 */
export function PayrollDetailPanel({ sheet }: Readonly<{ sheet: PayrollSheet }>) {
  const [tab, setTab] = useState<Tab>("info"), prefix = useId();
  const panel = (key: Tab, children: ReactNode) =>
    <div role="tabpanel" id={`${prefix}-panel-${key}`} aria-labelledby={`${prefix}-tab-${key}`} hidden={tab !== key} className={s.tabBody}>{children}</div>;
  return <section className={s.detail} aria-label="Chi tiết bảng lương">
    <Subtabs<Tab> label="Nội dung bảng lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    {panel("info", <dl className={s.facts}>
      <div><dt>Kỳ lương</dt><dd>{sheet.periodLabel}</dd></div>
      <div><dt>Từ ngày</dt><dd>{formatVietnameseDate(sheet.from)}</dd></div>
      <div><dt>Đến ngày</dt><dd>{formatVietnameseDate(sheet.to)}</dd></div>
      <div><dt>Trạng thái</dt><dd><StatusPill tone={payrollStatusTone(sheet.status)}>{payrollStatusLabel(sheet.status)}</StatusPill></dd></div>
      <div><dt>Tổng lương</dt><dd><Money value={sheet.total} /></dd></div>
    </dl>)}
    {panel("slips", <div className={s.subTable}><PayrollDataTable caption="Phiếu lương" columns={slipColumns} rows={sheet.slips} /></div>)}
    {panel("labor", <div className={s.subTable}><PayrollDataTable caption="Chi phí nhân công theo bè" columns={laborColumns} rows={sheet.laborCosts} /></div>)}
    {panel("payments", <div className={s.subTable}><PayrollDataTable caption="Lịch sử thanh toán" columns={paymentColumns} rows={sheet.payments} /></div>)}
  </section>;
}
