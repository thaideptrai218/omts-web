"use client";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { businessToday, displayTime } from "./ui";
import type { WorkforceColumn } from "./workforce-columns";
import styles from "./workforce-screen.module.css";
import { attendanceLabel, attendanceState, breakLabel, workedLabel, type Assignment, type AssignmentAction } from "./workforce-shared";

const recorded = (value: string | null) => (value ? displayTime(value) : "Chưa ghi nhận");

/**
 * Detail of an opened assignment; its actions sit in the footer and follow these rules:
 * - remove: today or later, nothing checked yet, and Delete permission on the zone;
 * - check in/out: only on the current business day with AttendanceCreate permission;
 *   check-in also needs a job type and no prior check-in/out (a raft is optional: zone-level assignments have none).
 */
function AssignmentDetail({ row, zoneName, allowed, disabled, pending, onAct }: {
  row: Assignment; zoneName(id: string): string; allowed(action: string, zoneId?: string): boolean; disabled: boolean; pending: boolean; onAct(row: Assignment, action: AssignmentAction): void;
}) {
  const canRemove = row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", row.zoneId);
  const canAttend = row.date === businessToday() && allowed("AttendanceCreate", row.zoneId);
  // A zone-level assignment (nursery, seeding or harvest crew) has no raft: the zone is enough, the backend checks the zone of the caller.
  const canCheckIn = canAttend && !row.checkedInAt && !row.checkedOutAt && !!row.jobTypeId;
  const canCheckOut = canAttend && !row.checkedOutAt;
  return <section id={`assignment-${row.id}`} className={styles.detail} aria-label={`Chi tiết phân công ${row.employeeName}`}>
    <div className={styles.infoHead}>
      <h3>{row.employeeName}</h3>
      <span className={styles.status} data-state={attendanceState(row)}>{attendanceLabel[attendanceState(row)]}</span>
    </div>
    <dl className={styles.facts}>
      <div><dt>Ngày làm việc</dt><dd>{formatVietnameseDate(row.date)}</dd></div>
      <div><dt>Vùng làm việc</dt><dd>{zoneName(row.zoneId)}</dd></div>
      <div><dt>Bè nuôi</dt><dd>{row.raftCode || "Chưa xác định"}</dd></div>
      <div><dt>Công việc được giao</dt><dd>{row.job}</dd></div>
      <div><dt>Vào làm</dt><dd>{recorded(row.checkedInAt)}</dd></div>
      <div><dt>Ra về</dt><dd>{recorded(row.checkedOutAt)}</dd></div>
      <div><dt>Giờ công trong ngày</dt><dd>{workedLabel(row)}</dd></div>
      <div><dt>Giờ nghỉ đã trừ</dt><dd>{breakLabel(row)}</dd></div>
    </dl>
    {(canRemove || canCheckIn || canCheckOut) && <footer className={styles.footer}>
      <div>{canRemove && <Button key="remove" type="button" className="w-auto" variant="ghost" disabled={disabled} aria-busy={pending || undefined} onClick={() => onAct(row, "remove")}><InterfaceIcon name="trash" className="size-4" />{pending ? "Đang gỡ…" : "Gỡ phân công"}</Button>}</div>
      <div>
        {canCheckOut && <Button key="check-out" type="button" className="w-auto" variant="secondary" disabled={disabled} aria-busy={pending || undefined} onClick={() => onAct(row, "check-out")}>{pending ? "Đang ghi…" : "Ghi ra về"}</Button>}
        {canCheckIn && <Button key="check-in" type="button" className="w-auto" disabled={disabled} aria-busy={pending || undefined} onClick={() => onAct(row, "check-in")}>{pending ? "Đang ghi…" : "Ghi vào làm"}</Button>}
      </div>
    </footer>}
  </section>;
}

/** One assignment row: the closed row only offers the chevron; everything else happens in the opened detail. */
export function WorkforceAssignmentRow({ row, columns, open, zoneName, allowed, disabled, pending, onToggle, onAct }: {
  row: Assignment; columns: readonly WorkforceColumn[]; open: boolean; zoneName(id: string): string; allowed(action: string, zoneId?: string): boolean;
  disabled: boolean; pending: boolean; onToggle(): void; onAct(row: Assignment, action: AssignmentAction): void;
}) {
  return <Fragment>
    <OpenableTableRow data-selected={open || undefined} onOpen={onToggle}>
      <td className={styles.expandCell}>
        <button type="button" aria-expanded={open} aria-controls={`assignment-${row.id}`} aria-label={`${open ? "Thu gọn" : "Mở"} phân công ${row.employeeName}`} onClick={onToggle}>
          <InterfaceIcon name={open ? "chevron-down" : "chevron-right"} />
        </button>
      </td>
      {columns.map((column) => <td key={column.key}>{column.render(row, zoneName)}</td>)}
    </OpenableTableRow>
    {open && <tr><td colSpan={columns.length + 1} className={styles.detailCell}>
      <div className={managementStyles.viewWidth}><AssignmentDetail row={row} zoneName={zoneName} allowed={allowed} disabled={disabled} pending={pending} onAct={onAct} /></div>
    </td></tr>}
  </Fragment>;
}
