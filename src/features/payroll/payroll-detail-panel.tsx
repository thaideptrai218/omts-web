"use client";
import { useCallback, useId, useState } from "react";
import { ListStateMessage, Subtabs } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { Money, Skeleton, useRemote } from "@/features/operations/ui";
import type { Slip } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { PayrollDetailFooter, type DetailTab } from "./payroll-detail-footer";
import { formatDateTime, monthLabel, periodLabel, rangeLabel, statusLabel, statusTone } from "./payroll-model";
import { payrollRepository } from "./repository";
import s from "./payroll-screen.module.css";

const tabs = [{ key: "info" as const, label: "Thông tin" }, { key: "slips" as const, label: "Phiếu lương" }];
const slipColumns: readonly DataColumn<Slip>[] = [
  { key: "code", label: "Mã phiếu lương", render: (slip) => <span className={s.mono}>{slip.code}</span> },
  { key: "employee", label: "Tên nhân viên", render: (slip) => <a className={`${s.name} ${s.link}`} href={`/workspace/employees?recordId=${slip.employeeId}&search=${encodeURIComponent(slip.employeeName)}`}>{slip.employeeName}</a> },
  { key: "main", label: "Lương chính", right: true, render: (slip) => <><Money value={slip.mainPay} /><div className={s.muted}>{slip.hours} giờ{slip.hourlyRateNote ? ` × ${slip.hourlyRateNote}` : ""}</div></> },
  { key: "bonus", label: "Thưởng", right: true, render: (slip) => <Money value={slip.bonus} /> },
  { key: "deduction", label: "Giảm trừ", right: true, render: (slip) => <Money value={slip.deduction} /> },
  { key: "income", label: "Tổng thu nhập", right: true, render: (slip) => <Money value={slip.income} /> },
  { key: "net", label: "Lương thực nhận", right: true, render: (slip) => <Money value={slip.net} /> },
  { key: "paid", label: "Đã trả", right: true, render: (slip) => <Money value={slip.paid} /> },
  { key: "outstanding", label: "Còn cần trả", right: true, render: (slip) => <Money value={slip.outstanding} /> },
];

/** The open row of Bảng lương: tabs "Thông tin" and "Phiếu lương" (KiotViet), with the actions of the sheet's status in the footer. */
export function PayrollDetailPanel({ id, onChanged }: { id: string; onChanged(notice?: string): void }) {
  const [tab, setTab] = useState<DetailTab>("info"), prefix = useId();
  const remote = useRemote(useCallback((signal: AbortSignal) => payrollRepository.detail(id, signal), [id]));
  const sheet = remote.data;
  const body = remote.loading ? <Skeleton /> : remote.error || !sheet ? <ListStateMessage error={remote.error ?? "Không tải được bảng lương."} onRetry={remote.reload} retryLabel="Tải lại" /> : <>
    <div role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} className={s.tabBody}>
      {tab === "info"
        ? <dl className={s.facts}>
          {([["Mã bảng lương", sheet.code], ["Tên bảng lương", sheet.name], ["Kỳ hạn trả lương", periodLabel[sheet.periodType]], ["Kỳ làm việc", rangeLabel(sheet.from, sheet.to)],
            ["Phạm vi áp dụng", sheet.scope === "All" ? "Tất cả nhân viên" : `Nhân viên được chọn (${sheet.slips.length})`], ["Người tạo", sheet.createdBy ?? "—"],
            ["Ngày tạo", formatDateTime(sheet.createdAt)], ["Tháng ghi nhận chi phí", sheet.status === "Finalized" ? monthLabel(sheet.expenseMonth) : "—"], ["Ghi chú", sheet.note || "—"]] as const)
            .map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div><dt>Trạng thái</dt><dd><StatusPill tone={statusTone(sheet.status)}>{statusLabel[sheet.status]}</StatusPill></dd></div>
        </dl>
        : <div className={s.subTable}><PayrollDataTable caption="Phiếu lương" columns={slipColumns} rows={sheet.slips} emptyText="Bảng lương chưa có phiếu lương." /></div>}
    </div>
    <PayrollDetailFooter sheet={sheet} tab={tab} onChanged={(notice) => { remote.reload(); onChanged(notice); }} />
  </>;
  return <section className={s.detail} aria-label="Chi tiết bảng lương">
    <Subtabs<DetailTab> label="Nội dung bảng lương" tabs={tabs} value={tab} onChange={setTab} idPrefix={prefix} />
    {body}
  </section>;
}
