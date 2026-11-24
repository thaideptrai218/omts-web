"use client";
import { Money } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { SlipDetail } from "./contracts";
import { PayrollDataTable, type DataColumn } from "./payroll-data-table";
import { formatClock, formatHours } from "./payroll-model";

type Day = SlipDetail["attendance"][number] & { id: string };

/**
 * "Chấm công chi tiết" of a payslip: one row per day and job type with the rafts, the check-in/out, the hours, the rate of that day and the amount, so Giờ × Đơn giá = Thành tiền
 * can be followed. Amounts are rounded to the VND per day and job; the payslip line rounds the whole period once, so a total can differ by a few dong.
 */
export function PayrollSlipAttendanceTable({ days }: { days: SlipDetail["attendance"] }) {
  const rows: Day[] = days.map((day, index) => ({ ...day, id: String(index) }));
  const columns: DataColumn<Day>[] = [
    { key: "date", label: "Ngày", render: (row) => formatVietnameseDate(row.date) },
    { key: "raft", label: "Bè", render: (row) => row.raftCodes || "—" },
    { key: "job", label: "Loại việc", render: (row) => row.jobName },
    { key: "time", label: "Vào - ra", render: (row) => row.checkInAt ? `${formatClock(row.checkInAt)} - ${formatClock(row.checkOutAt) || "…"}` : "—" },
    { key: "hours", label: "Giờ công", right: true, render: (row) => formatHours(row.hours) },
    { key: "rate", label: "Đơn giá", right: true, render: (row) => row.hourlyRate === undefined ? "—" : <Money value={row.hourlyRate} /> },
    { key: "amount", label: "Thành tiền", right: true, render: (row) => row.amount === undefined ? "—" : <Money value={row.amount} /> },
  ];
  return <PayrollDataTable caption="Chấm công chi tiết" columns={columns} rows={rows} emptyText="Không có chấm công trong kỳ." />;
}