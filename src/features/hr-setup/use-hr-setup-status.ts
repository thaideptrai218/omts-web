"use client";
import { useCallback, useMemo } from "react";
import { employeePageSchema } from "@/features/employee-api/contracts";
import { jobsPage } from "@/features/labor-api/contracts";
import { attendanceRoundingMinutes, attendanceSettingsSchema } from "@/features/operations/new-module-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";
import { sheetPage } from "@/features/payroll/contracts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { payrollSettingsView } from "./payroll-settings-contracts";

export type SetupStatus = Readonly<{
  key: "employees" | "job-types" | "attendance" | "payroll-settings" | "payroll";
  loading: boolean; error?: string; reload(): void;
  /** Undefined while loading or on error; true when the step already has what it needs. */
  done?: boolean; summary?: string;
}>;

const clock = (value: string | null) => value?.slice(0, 5) ?? "";

/**
 * Trạng thái năm bước thiết lập nhân sự, đọc từ API sẵn có (không lưu gì thêm): nhân viên, loại việc có đơn giá,
 * thiết lập chấm công, kỳ lương, bảng lương gần nhất. Mỗi bước tải độc lập nên một bước lỗi không che các bước còn lại.
 */
export function useHrSetupStatus(): readonly SetupStatus[] {
  const employees = useMemo(() => createOperationsRepository("employees"), []);
  const jobs = useMemo(() => createOperationsRepository("job-types"), []);
  const workforce = useMemo(() => createOperationsRepository("workforce"), []);
  const settings = useMemo(() => createOperationsRepository("payroll-settings"), []);
  const payroll = useMemo(() => createOperationsRepository("payroll"), []);
  const staff = useRemote(useCallback((signal: AbortSignal) => employees.read("list", { statusId: "401", page: "1", pageSize: "1" }, employeePageSchema, signal), [employees]));
  const jobTypes = useRemote(useCallback((signal: AbortSignal) => jobs.read("list", { statusId: "101", page: "1", pageSize: "100" }, jobsPage, signal), [jobs]));
  const attendance = useRemote(useCallback((signal: AbortSignal) => workforce.read("settings", {}, attendanceSettingsSchema, signal), [workforce]));
  const period = useRemote(useCallback((signal: AbortSignal) => settings.read("read", {}, payrollSettingsView, signal), [settings]));
  const sheets = useRemote(useCallback((signal: AbortSignal) => payroll.read("list", { page: "1", pageSize: "1", sortBy: "from", sortDir: "desc" }, sheetPage, signal), [payroll]));

  const priced = jobTypes.data?.items.filter((job) => job.currentRate).length;
  const current = attendance.data?.current;
  const latest = sheets.data?.items[0];
  return [
    { key: "employees", loading: staff.loading, error: staff.error, reload: staff.reload, done: staff.data ? staff.data.total > 0 : undefined, summary: staff.data ? `${staff.data.total} nhân viên đang làm việc` : undefined },
    { key: "job-types", loading: jobTypes.loading, error: jobTypes.error, reload: jobTypes.reload, done: priced === undefined ? undefined : priced > 0, summary: priced === undefined ? undefined : `${priced} loại việc có đơn giá` },
    { key: "attendance", loading: attendance.loading, error: attendance.error, reload: attendance.reload, done: attendance.data ? attendance.data.versions.length > 0 : undefined,
      summary: current ? `${current.breakStart && current.breakEnd ? `Nghỉ ${clock(current.breakStart)} - ${clock(current.breakEnd)}` : "Không có giờ nghỉ"}, làm tròn ${attendanceRoundingMinutes[current.roundingUnit]} phút, từ ${formatVietnameseDate(current.effectiveFrom)}` : undefined },
    { key: "payroll-settings", loading: period.loading, error: period.error, reload: period.reload, done: period.data ? true : undefined, summary: period.data ? `Kỳ lương bắt đầu ngày ${period.data.payPeriodStartDay} hằng tháng` : undefined },
    { key: "payroll", loading: sheets.loading, error: sheets.error, reload: sheets.reload, done: sheets.data ? sheets.data.total > 0 : undefined, summary: sheets.data ? (latest ? `${sheets.data.total} bảng lương, gần nhất ${latest.name}` : "Chưa có bảng lương") : undefined },
  ];
}
