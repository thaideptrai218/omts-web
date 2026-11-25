"use client";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { useEmployeeKinds } from "@/features/employee-api/use-employee-types";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { businessToday, displayTime } from "./ui";
import type { WorkforceColumn } from "./workforce-columns";
import { QuickActionCell } from "./workforce-quick-action";
import styles from "./workforce-screen.module.css";
import { attendanceActionLabel, attendanceLabel, attendanceState, breakLabel, isCarryOver, workedLabel, type Assignment, type AssignmentAction } from "./workforce-shared";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";

const recorded = (value: string | null) => (value ? displayTime(value) : "Chưa ghi nhận");

/**
 * Detail of an opened assignment; its actions sit in the footer and follow these rules:
 * - remove: today or later, nothing checked yet, and Delete permission on the zone;
 * - check in/out: only on the current business day with AttendanceCreate permission, or the check-out of a night shift left open from yesterday;
 *   check-in also needs a job type and no prior check-in/out (a raft is optional: zone-level assignments have none); the check-out needs a check-in;
 * - correct attendance: the Owner or Staff with ATTENDANCE Edit in the zone, once the day has started (it is also the way to enter a missing check-in).
 */
function AssignmentDetail({ row, kind, zoneName, allowed, disabled, pending, onAct, onCorrect }: {
  row: Assignment; kind?: string; zoneName(id: string): string; allowed(action: string, zoneId?: string): boolean; disabled: boolean; pending: boolean;
  onAct(row: Assignment, action: AssignmentAction): void; onCorrect(row: Assignment): void;
}) {
  const canRemove = row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", row.zoneId);
  const canAttend = (row.date === businessToday() || isCarryOver(row, businessToday())) && allowed("AttendanceCreate", row.zoneId);
  // The Owner, or Staff holding ATTENDANCE Edit in the zone of this row (the backend checks the zone again); the reason is mandatory in the dialog.
  const canCorrect = allowed("AttendanceEdit", row.zoneId) && row.date <= businessToday();
  // A zone-level assignment (nursery, seeding or harvest crew) has no raft: the zone is enough, the backend checks the zone of the caller.
  const canCheckIn = canAttend && !row.checkedInAt && !row.checkedOutAt && !!row.jobTypeId;
  const canCheckOut = canAttend && !row.checkedOutAt;
  // A check-out needs a check-in first; with none, whoever may correct attendance enters both times through "Sửa chấm công".
  const noCheckIn = !row.checkedInAt;
  return <section id={`assignment-${row.id}`} className={styles.detail} aria-label={`Chi tiết phân công ${row.employeeName}`}>
    <div className={styles.infoHead}>
      <h3>{row.employeeName}<EmployeeTypeBadge type={kind} showLabel className="ml-2" /></h3>
      <span className={styles.status} data-state={attendanceState(row)}>{attendanceLabel[attendanceState(row)]}</span>
    </div>
    <dl className={styles.facts}>
      <div><dt>Ngày làm việc</dt><dd>{formatVietnameseDate(row.date)}</dd></div>
      <div><dt>Vùng làm việc</dt><dd>{zoneName(row.zoneId)}</dd></div>
      <div><dt>Bè nuôi</dt><dd>{row.raftCode || "Cấp vùng"}</dd></div>
      <div><dt>Công việc được giao</dt><dd>{row.job}</dd></div>
      <div><dt>Vào làm</dt><dd>{recorded(row.checkedInAt)}</dd></div>
      <div><dt>Ra về</dt><dd>{recorded(row.checkedOutAt)}</dd></div>
      <div><dt>Giờ công trong ngày</dt><dd>{workedLabel(row)}</dd></div>
      <div><dt>Giờ nghỉ đã trừ</dt><dd>{breakLabel(row)}</dd></div>
    </dl>
    {(canRemove || canCheckIn || canCheckOut || canCorrect) && <footer className={styles.footer}>
      <div>
        {canRemove && <Button key="remove" type="button" className="w-auto" variant="ghost" disabled={disabled} aria-busy={pending || undefined} onClick={() => onAct(row, "remove")}><InterfaceIcon name="trash" className="size-4" />{pending ? "Đang gỡ…" : "Gỡ phân công"}</Button>}
        {canCorrect && <Button key="correct" type="button" className="w-auto" variant="ghost" disabled={disabled} onClick={() => onCorrect(row)}>Sửa chấm công</Button>}
      </div>
      <div>
        {canCheckOut && <Button key="check-out" type="button" className="w-auto" variant="secondary" disabled={disabled || noCheckIn} title={noCheckIn ? "Chưa có giờ vào làm. Hãy bấm Vào làm trước, hoặc dùng Sửa chấm công." : undefined} aria-busy={pending || undefined} onClick={() => onAct(row, "check-out")}>{pending ? "Đang ghi…" : attendanceActionLabel["check-out"]}</Button>}
        {canCheckIn && <Button key="check-in" type="button" className="w-auto" disabled={disabled} aria-busy={pending || undefined} onClick={() => onAct(row, "check-in")}>{pending ? "Đang ghi…" : attendanceActionLabel["check-in"]}</Button>}
      </div>
    </footer>}
  </section>;
}

/** One assignment row: the closed row only offers the chevron; everything else happens in the opened detail. */
export function WorkforceAssignmentRow({ row, columns, open, zoneName, allowed, disabled, pending, onToggle, onAct, selectable, selected, onSelect, onCorrect }: {
  row: Assignment; columns: readonly WorkforceColumn[]; open: boolean; zoneName(id: string): string; allowed(action: string, zoneId?: string): boolean;
  disabled: boolean; pending: boolean; onToggle(): void; onAct(row: Assignment, action: AssignmentAction): void;
  selectable: boolean; selected: boolean; onSelect(on: boolean): void; onCorrect(row: Assignment): void;
}) {
  const kind = useEmployeeKinds()(row.employeeId);
  return <Fragment>
    <OpenableTableRow data-selected={open || undefined} onOpen={onToggle}>
      {selectable && <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" aria-label={`Chọn ${row.employeeName}`} checked={selected} disabled={disabled} onChange={(event) => onSelect(event.target.checked)} />
      </td>}
      <td className={styles.expandCell}>
        <button type="button" aria-expanded={open} aria-controls={`assignment-${row.id}`} aria-label={`${open ? "Thu gọn" : "Mở"} phân công ${row.employeeName}`} onClick={onToggle}>
          <InterfaceIcon name={open ? "chevron-down" : "chevron-right"} />
        </button>
      </td>
      {columns.map((column) => <td key={column.key}>{column.render(row, zoneName, kind)}</td>)}
      {selectable && <QuickActionCell row={row} allowed={allowed} disabled={disabled} pending={pending} onAct={onAct} />}
    </OpenableTableRow>
    {open && <DetailRow colSpan={columns.length + (selectable ? 3 : 1)} className={styles.detailCell}>
      <div className={managementStyles.viewWidth}><AssignmentDetail row={row} kind={kind} zoneName={zoneName} allowed={allowed} disabled={disabled} pending={pending} onAct={onAct} onCorrect={onCorrect} /></div>
    </DetailRow>}
  </Fragment>;
}
