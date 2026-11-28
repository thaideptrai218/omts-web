"use client";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import type { SheetDetail } from "./contracts";
import { formatDateTime, leftOutLines, monthLabel, periodLabel, rangeLabel, scopeLabel, statusLabel, statusTone } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** Tab "Thông tin" of an open sheet (KiotViet): the sheet's fields, with the three totals. */
export function PayrollSheetInfoTab({ sheet }: { sheet: SheetDetail }) {
  const facts: readonly (readonly [string, ReactNode])[] = [
    ["Mã bảng lương", sheet.code], ["Tên bảng lương", sheet.name], ["Kỳ hạn trả lương", periodLabel[sheet.periodType]], ["Kỳ làm việc", rangeLabel(sheet.from, sheet.to)],
    ["Ngày tạo", formatDateTime(sheet.createdAt)], ["Người tạo", sheet.createdBy ?? "—"],
    ["Ngày chốt lương", sheet.finalizedAt ? formatDateTime(sheet.finalizedAt) : "—"], ["Người chốt lương", sheet.finalizedBy ?? "—"], ["Trạng thái", <StatusPill key="status" tone={statusTone(sheet.status)}>{statusLabel[sheet.status]}</StatusPill>],
    ["Tổng số nhân viên", String(sheet.slips.length)], ["Tổng lương", <Money key="total" value={sheet.total} />], ["Đã trả nhân viên", <Money key="paid" value={sheet.paid} />], ["Còn cần trả", <Money key="outstanding" value={sheet.outstanding} />],
    ["Phạm vi áp dụng", scopeLabel[sheet.scope]], ["Tháng ghi nhận chi phí", sheet.status === "Finalized" ? monthLabel(sheet.expenseMonth) : "—"], ["Ghi chú", sheet.note || "—"],
  ];
  return <>
    <dl className={s.facts} data-testid="payroll-sheet-totals">
      {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {sheet.leftOut?.length ? <div className="mt-3" role="status" data-testid="payroll-left-out"><p className={s.sectionTitle}>Nhân viên không có trong bảng này</p>
      {leftOutLines(sheet.leftOut).map((line) => <p key={line} className={s.muted}>{line}</p>)}</div> : null}
    {sheet.status === "Provisional" && <p className={`${s.muted} mt-3`}>Số liệu tạm tính. Chọn Tải lại dữ liệu để tính lại theo chấm công mới nhất.</p>}
  </>;
}
