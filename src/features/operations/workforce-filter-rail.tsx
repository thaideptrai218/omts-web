"use client";
import { EmployeeTypeFilter } from "@/features/employee-api/employee-type-filter";
import { ZoneFilterField } from "@/features/api-workspace/zone-filter";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { isDateOnly } from "@/shared/format/date-only";
import { businessToday } from "./ui";
import type { WorkforceBoard } from "./workforce-board-state";
import styles from "./workforce-screen.module.css";
import { attendanceLabel, attendanceState, formatWorked, type Assignment } from "./workforce-shared";

const figures: readonly (readonly [string, (rows: Assignment[]) => number])[] = [
  ["Phân công", (rows) => rows.length],
  ["Nhân viên", (rows) => new Set(rows.map((row) => row.employeeId)).size],
  ["Đang làm", (rows) => rows.filter((row) => attendanceState(row) === "working").length],
  ["Thiếu lượt vào", (rows) => rows.filter((row) => attendanceState(row) === "missing").length],
];

/** Filter column: working day with day stepping, zone (only zones the user may see) and attendance status, plus the day's figures. */
export function WorkforceFilterRail({ board }: { board: WorkforceBoard }) {
  const { rows, scopedRows, day } = board;
  const busy = rows.loading || !!rows.error;
  return <>
    <div className={styles.railHead}>
      <strong>Bộ lọc</strong>
      <button type="button" className={managementStyles.linkButton} disabled={!board.hasFilter} onClick={() => board.reset()}>Đặt lại</button>
    </div>
    {/* The figures count assignments; the tab of internal staff has none, so showing "0" there would mislead. */}
    {board.mode !== "staff" && <dl className={styles.figures} aria-busy={busy}>
      {figures.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{busy ? "—" : scopedRows ? count(scopedRows) : 0}</dd></div>)}
      <div className={styles.figureWide}><dt>Tổng giờ công trong ngày</dt><dd>{busy ? "—" : formatWorked(scopedRows?.reduce((sum, row) => sum + (row.workedMinutes ?? 0), 0) ?? 0)}</dd></div>
    </dl>}
    <FilterGroup legend="Ngày làm việc">
      <DatePickerField label="Ngày làm việc" value={day} onChange={board.setDay} />
      <div className={styles.dayStep} role="group" aria-label="Chuyển ngày làm việc">
        <button type="button" aria-label="Ngày trước" title="Ngày trước" disabled={!isDateOnly(day) || rows.loading} onClick={() => board.moveDay(-1)}><InterfaceIcon name="chevron-left" /></button>
        <button type="button" disabled={day === businessToday()} onClick={board.goToday}>Hôm nay</button>
        <button type="button" aria-label="Ngày sau" title="Ngày sau" disabled={!isDateOnly(day) || rows.loading} onClick={() => board.moveDay(1)}><InterfaceIcon name="chevron-right" /></button>
      </div>
    </FilterGroup>
    {/* The internal-staff tab reads by day only: the zone choice and the assignment list reload do nothing there, so they are hidden. */}
    {board.mode !== "staff" && <ZoneFilterField filter={board.zoneFilter} legend="Vùng làm việc" className={styles.select} />}
    <EmployeeTypeFilter value={board.typeFilter} onChange={board.setTypeFilter} name="workforce-employee-type" />
    <FilterPills legend="Trạng thái chấm công" name="workforce-status" value={board.status} options={Object.entries(attendanceLabel)} onChange={board.setStatus} />
    {board.mode !== "staff" && <button type="button" className={`${managementStyles.linkButton} ${styles.reload}`} disabled={rows.loading || board.editor.pending} onClick={rows.reload}>Làm mới danh sách</button>}
  </>;
}
