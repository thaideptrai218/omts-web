"use client";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { money } from "@/features/operations/ui";
import type { HrProblem, HrProblemItem } from "@/shared/messages/hr-problem";
import s from "./payroll-screen.module.css";

const kindLabel: Record<string, string> = {
  PeriodNotEnded: "Kỳ làm việc chưa kết thúc",
  IncompleteAttendance: "Thiếu giờ vào hoặc giờ ra",
  NoRate: "Chưa có đơn giá giờ",
  NoShiftRate: "Chưa có đơn giá ca",
  NoSalarySetup: "Chưa thiết lập lương",
  NegativePay: "Khấu trừ lớn hơn thu nhập của phiếu lương",
  NoHours: "Chưa có giờ công",
};
/** The employee list opens on that employee (its "Thiết lập lương" tab holds the setup), so one click reaches the missing salary. */
const salarySetupHref = (employeeId: string | null | undefined, name: string) => `/workspace/employees?${employeeId ? `recordId=${employeeId}&` : ""}search=${encodeURIComponent(name)}`;
const dayList = (days?: readonly string[]) => days?.map(formatVietnameseDate).join(", ") ?? "";

export type AttendanceTarget = { employeeId: string; employeeName: string; day: string };

/**
 * Why the sheet cannot be finalized (MSG-LABOR-28), as a list: who, what is missing and on which days. A day with a missing check-in or
 * check-out gets a "Sửa chấm công" button that opens the correction of that employee and day; a missing salary setup links to the salary of that employee;
 * a job type without a shift rate names the days; a negative payslip tells to lower its khấu trừ.
 */
export function FinalizeReasonList({ items, fixed, onFix }: { items: readonly HrProblemItem[]; fixed: ReadonlySet<string>; onFix(target: AttendanceTarget): void }) {
  return <ul className={s.reasonList} aria-label="Lý do chưa chốt được">
    {items.map((item, index) => <li key={`${item.kind}-${item.employeeId ?? ""}-${index}`} className={s.reasonItem}>
      {item.kind === "NoShiftRate" ? <>Loại việc <strong>{item.jobName ?? "chưa rõ"}</strong> chưa có đơn giá ca{item.dates?.length ? ` ngày ${dayList(item.dates)}` : ""}.</>
      : <><strong>{item.employeeName ?? "Bảng lương"}</strong>: {kindLabel[item.kind] ?? "Chưa đủ điều kiện chốt"}
      {item.jobName ? ` (${item.jobName})` : ""}
      {item.kind === "NoSalarySetup" ? <a className={s.link} href={salarySetupHref(item.employeeId, item.employeeName ?? "")}>Thiết lập lương</a>
      : item.kind === "NegativePay" ? <span>. Sửa khấu trừ trong phiếu lương của nhân viên này rồi tải lại bảng lương.</span>
      : item.kind === "IncompleteAttendance" && item.employeeId
        ? <span>{item.dates?.map((day) => {
          const key = `${item.employeeId}|${day}`;
          return <button key={day} type="button" className={s.link} onClick={() => onFix({ employeeId: item.employeeId!, employeeName: item.employeeName ?? "", day })}>
            {fixed.has(key) ? `Đã sửa ${formatVietnameseDate(day)}, sửa lại` : `Sửa chấm công ${formatVietnameseDate(day)}`}
          </button>;
        })}</span>
        : item.dates?.length ? <span>: {dayList(item.dates)}</span> : null}</>}
    </li>)}
  </ul>;
}

/** 409 TOTALS_CHANGED: the figures the Owner viewed against the figures now. Nothing was finalized. */
export function TotalsChangedNotice({ problem }: { problem: HrProblem }) {
  const p = problem.parameters ?? {};
  return <div role="alert" className={s.warnNote}>
    <p>Số liệu bảng lương đã thay đổi từ lần bạn xem, nên chưa chốt.</p>
    <dl className={s.previewGrid}>
      <div><dt>Trước đó</dt><dd>{String(p.slips_before ?? problem.expectedSlips ?? "—")} phiếu, {money(Number(p.total_before ?? problem.expectedTotal))}</dd></div>
      <div><dt>Hiện tại</dt><dd>{String(p.slips_now ?? problem.currentSlips ?? "—")} phiếu, {money(Number(p.total_now ?? problem.currentTotal))}</dd></div>
    </dl>
    <p>Kiểm tra lại, rồi xác nhận để chốt theo số mới.</p>
  </div>;
}
