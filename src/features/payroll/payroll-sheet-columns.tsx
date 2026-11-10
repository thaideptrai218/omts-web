import { StatusPill } from "@/components/ui/management-page";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { payrollStatusLabel, type PayrollSheet, type PayrollStatus } from "./payroll-model";
import type { DataColumn } from "./payroll-data-table";
import s from "./payroll-screen.module.css";

export const payrollStatusTone = (status: PayrollStatus) => status === "final" ? "success" : status === "returned" ? "danger" : "neutral";

/** The list columns of the SRS/frame: period, date span, status, total, payment. */
export const sheetColumns: readonly DataColumn<PayrollSheet>[] = [
  { key: "period", label: "Kỳ lương", render: (sheet) => <span className={s.name}>{sheet.periodLabel}</span> },
  { key: "span", label: "Từ–đến ngày", render: (sheet) => `${formatVietnameseDate(sheet.from)} – ${formatVietnameseDate(sheet.to)}` },
  { key: "status", label: "Trạng thái", render: (sheet) => <StatusPill tone={payrollStatusTone(sheet.status)}>{payrollStatusLabel(sheet.status)}</StatusPill> },
  { key: "total", label: "Tổng lương", right: true, render: (sheet) => <Money value={sheet.total} /> },
  { key: "payment", label: "Thanh toán lương", render: (sheet) => sheet.paymentLabel },
];
