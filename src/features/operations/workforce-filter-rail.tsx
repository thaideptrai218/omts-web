"use client";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { isDateOnly } from "@/shared/format/date-only";
import { businessToday } from "./ui";
import type { WorkforceBoard } from "./workforce-board-state";
import styles from "./workforce-screen.module.css";
import { attendanceLabel, attendanceState, type Assignment } from "./workforce-shared";

const figures: readonly (readonly [string, (rows: Assignment[]) => number])[] = [
  ["Phân công", (rows) => rows.length],
  ["Nhân viên", (rows) => new Set(rows.map((row) => row.employeeId)).size],
  ["Đang làm", (rows) => rows.filter((row) => attendanceState(row) === "working").length],
  ["Thiếu lượt vào", (rows) => rows.filter((row) => attendanceState(row) === "missing").length],
];

/** Filter column: working day with day stepping, zone (only zones the user may see) and attendance status, plus the day's figures. */
export function WorkforceFilterRail({ board }: { board: WorkforceBoard }) {
  const { rows, scopedRows, day, zoneId } = board;
  const busy = rows.loading || !!rows.error;
  return <>
    <div className={styles.railHead}>
      <strong>Bộ lọc</strong>
      <button type="button" className={managementStyles.linkButton} disabled={!board.hasFilter} onClick={() => board.reset()}>Đặt lại</button>
    </div>
    <dl className={styles.figures} aria-busy={busy}>
      {figures.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{busy ? "—" : scopedRows ? count(scopedRows) : 0}</dd></div>)}
    </dl>
    <FilterGroup legend="Ngày làm việc">
      <DatePickerField label="Ngày làm việc" value={day} onChange={board.setDay} />
      <div className={styles.dayStep} role="group" aria-label="Chuyển ngày làm việc">
        <button type="button" aria-label="Ngày trước" title="Ngày trước" disabled={!isDateOnly(day) || rows.loading} onClick={() => board.moveDay(-1)}><InterfaceIcon name="chevron-left" /></button>
        <button type="button" disabled={day === businessToday()} onClick={board.goToday}>Hôm nay</button>
        <button type="button" aria-label="Ngày sau" title="Ngày sau" disabled={!isDateOnly(day) || rows.loading} onClick={() => board.moveDay(1)}><InterfaceIcon name="chevron-right" /></button>
      </div>
    </FilterGroup>
    <FilterGroup legend="Vùng làm việc">
      <select className={styles.select} aria-label="Vùng làm việc" value={zoneId} onChange={(event) => board.setZoneId(event.target.value)}>
        <option value="">Tất cả vùng được cấp</option>
        {board.zoneOptions.map((id) => <option key={id} value={id}>{board.zoneName(id)}</option>)}
      </select>
    </FilterGroup>
    <FilterPills legend="Trạng thái chấm công" name="workforce-status" value={board.status} options={Object.entries(attendanceLabel)} onChange={board.setStatus} />
    <button type="button" className={`${managementStyles.linkButton} ${styles.reload}`} disabled={rows.loading || board.editor.pending} onClick={rows.reload}>Làm mới danh sách</button>
  </>;
}
