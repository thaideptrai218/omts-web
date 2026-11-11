"use client";
import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import type { SheetDetail } from "./contracts";
import { formatDateTime, monthLabel, periodLabel, rangeLabel, statusLabel, statusTone } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** Tab "Thông tin" of an open sheet (KiotViet): the sheet's fields, then the three totals and the number of employees. */
export function PayrollSheetInfoTab({ sheet }: { sheet: SheetDetail }) {
  const facts = [
    ["Mã bảng lương", sheet.code], ["Tên bảng lương", sheet.name], ["Kỳ hạn trả lương", periodLabel[sheet.periodType]], ["Kỳ làm việc", rangeLabel(sheet.from, sheet.to)],
    ["Phạm vi áp dụng", sheet.scope === "All" ? "Tất cả nhân viên" : "Nhân viên được chọn"], ["Số nhân viên", String(sheet.slips.length)], ["Người tạo", sheet.createdBy ?? "—"],
    ["Ngày tạo", formatDateTime(sheet.createdAt)], ["Tháng ghi nhận chi phí", sheet.status === "Finalized" ? monthLabel(sheet.expenseMonth) : "—"], ["Ghi chú", sheet.note || "—"],
  ] as const;
  return <>
    <dl className={s.facts}>
      {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      <div><dt>Trạng thái</dt><dd><StatusPill tone={statusTone(sheet.status)}>{statusLabel[sheet.status]}</StatusPill></dd></div>
    </dl>
    <p className={`${s.summary} mt-4`} data-testid="payroll-sheet-totals">
      <span>Tổng lương<strong><Money value={sheet.total} /></strong></span>
      <span>Đã trả<strong><Money value={sheet.paid} /></strong></span>
      <span>Còn cần trả<strong><Money value={sheet.outstanding} /></strong></span>
    </p>
  </>;
}
