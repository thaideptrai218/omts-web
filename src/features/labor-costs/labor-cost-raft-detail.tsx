"use client";
import { useCallback } from "react";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { ReportTable, type ReportColumn } from "@/features/sales-reports/report-parts";
import { vnd } from "@/features/sales-reports/report-format";
import { formatHours } from "@/features/payroll/payroll-model";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { readRaftCycleCosts } from "./use-labor-costs";
import type { CycleLaborCost, EmployeeLaborCost, JobLaborCost, RaftLaborCost } from "./labor-costs-contracts";
import styles from "./labor-costs.module.css";

const cycleColumns: ReportColumn<CycleLaborCost>[] = [
  { key: "start", header: "Chu kỳ nuôi", cell: (row) => `${formatVietnameseDate(row.startDate)} - ${row.closeDate ? formatVietnameseDate(row.closeDate) : "đang nuôi"}` },
  { key: "days", header: "Số ngày có công", numeric: true, cell: (row) => String(row.days.length) },
  { key: "hours", header: "Giờ công", numeric: true, cell: (row) => formatHours(row.hours ?? 0) },
  { key: "amount", header: "Chi phí cả chu kỳ", numeric: true, cell: (row) => vnd(row.amount) },
];
const jobColumns = (jobs: readonly JobLaborCost[]): ReportColumn<JobLaborCost>[] => [
  { key: "job", header: "Loại việc", cell: (row) => row.jobName, total: "Tổng" },
  { key: "hours", header: "Giờ công", numeric: true, cell: (row) => formatHours(row.hours), total: formatHours(jobs.reduce((sum, job) => sum + job.hours, 0)) },
  { key: "amount", header: "Chi phí", numeric: true, cell: (row) => vnd(row.amount), total: vnd(jobs.reduce((sum, job) => sum + job.amount, 0)) },
];
const employeeColumns: ReportColumn<EmployeeLaborCost>[] = [
  { key: "employee", header: "Nhân viên", cell: (row) => row.employeeCode ? `${row.employeeName} (${row.employeeCode})` : row.employeeName },
  { key: "jobs", header: "Loại việc", cell: (row) => row.byJob.map((job) => job.jobName).join(", ") || "—" },
  { key: "hours", header: "Giờ công", numeric: true, cell: (row) => formatHours(row.hours) },
  { key: "amount", header: "Chi phí", numeric: true, cell: (row) => vnd(row.amount) },
];

/**
 * Chi tiết của một bè: chi phí theo loại việc trong khoảng đang xem, các chu kỳ nuôi của bè, và với từng chu kỳ là chi phí theo nhân viên và từng ngày (BR-LABOR-07).
 * Dữ liệu chu kỳ lấy từ API chi phí nhân công nên Kế toán xem được mà không cần quyền Hành trình.
 * Công ươm cấp vùng (không thuộc bè nào) không tính vào chu kỳ nên chỉ có phần theo loại việc.
 */
export function LaborCostRaftDetail({ row, from, to }: Readonly<{ row: RaftLaborCost; from: string; to: string }>) {
  const detail = useRemote(useCallback((signal: AbortSignal) => row.raftId ? readRaftCycleCosts(row.raftId, signal) : Promise.resolve({ status: "success" as const, data: [] as CycleLaborCost[] }), [row.raftId]));
  const jobs = row.byJob ?? [];
  const byJob = jobs.length > 0 && <div><h4 className={styles.subTitle}>Theo loại việc trong khoảng đã chọn</h4>
    <ReportTable caption={`Chi phí theo loại việc của ${row.raftCode ?? "công ươm cấp vùng"}`} columns={jobColumns(jobs)} rows={jobs} rowKey={(job) => job.jobTypeId} /></div>;
  if (!row.raftId) return <div className={styles.detail}>{byJob}<p className={styles.note}>Công ươm cấp vùng không tính vào chu kỳ nuôi của bè nào, nên không có chi tiết theo chu kỳ.</p></div>;
  if (detail.loading) return <Skeleton />;
  if (detail.error) return <><ErrorNotice error={detail.error} /><button type="button" className={styles.link} onClick={detail.reload}>Tải lại</button></>;
  const data = detail.data ?? [];
  return (
    <div className={styles.detail}>
      {byJob}
      {!data.length ? <p className={styles.note}>Bè này chưa có chu kỳ nuôi.</p> : <>
        <ReportTable caption={`Chu kỳ nuôi của bè ${row.raftCode}`} columns={cycleColumns} rows={data} rowKey={(item) => item.cycleId} />
        {data.map((item) => <CycleCost key={item.cycleId} cycle={item} from={from} to={to} />)}
      </>}
    </div>
  );
}

function CycleCost({ cycle, from, to }: Readonly<{ cycle: CycleLaborCost; from: string; to: string }>) {
  const days = cycle.days.filter((day) => day.date >= from && day.date <= to), employees = cycle.employees ?? [];
  const label = formatVietnameseDate(cycle.startDate);
  return <div>
    <h4 className={styles.subTitle}>Chu kỳ từ {label}</h4>
    {employees.length > 0 && <ReportTable caption={`Chi phí theo nhân viên của chu kỳ từ ${label}`} columns={employeeColumns} rows={employees} rowKey={(item) => item.employeeId} />}
    {days.length
      ? <ReportTable caption={`Chi phí nhân công từng ngày của chu kỳ từ ${label}`} rows={days} rowKey={(day) => day.date}
        columns={[{ key: "date", header: "Ngày", cell: (day) => formatVietnameseDate(day.date), total: "Tổng trong khoảng" }, { key: "amount", header: "Chi phí", numeric: true, cell: (day) => vnd(day.amount), total: vnd(days.reduce((sum, day) => sum + day.amount, 0)) }]} />
      : <p className={styles.note}>Không có công nào của chu kỳ này trong khoảng đã chọn.</p>}
  </div>;
}