"use client";
import { Fragment, useState } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { formatVietnameseDate } from "@/shared/format/date-only";
import styles from "./workforce-screen.module.css";
import { Button } from "@/components/ui/button";
import { businessToday, displayTime } from "./ui";
import { attendanceLabel, attendanceState, type Assignment } from "./workforce-shared";

export type WorkforceTab = "assignments" | "attendance";
export type AssignmentAction = "remove" | "check-in" | "check-out";

/**
 * One assignment row. Row actions follow these rules:
 * - remove: today or later, nothing checked yet, and Delete permission on the zone;
 * - check in/out: only on the current business day with AttendanceCreate permission;
 *   check-in also needs a job type and raft and no prior check-in/out.
 */
export function WorkforceAssignmentRow({
  row,
  tab,
  zoneName,
  allowed,
  disabled,
  onAct,
}: {
  row: Assignment;
  tab: WorkforceTab;
  zoneName(id: string): string;
  allowed(action: string, zoneId?: string): boolean;
  disabled: boolean;
  onAct(row: Assignment, action: AssignmentAction): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canRemove =
    row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", row.zoneId);
  const canAttend = row.date === businessToday() && allowed("AttendanceCreate", row.zoneId);
  const canCheckIn = canAttend && !row.checkedInAt && !row.checkedOutAt && !!row.jobTypeId && !!row.raftId;
  const canCheckOut = canAttend && !row.checkedOutAt;

  return (
    <Fragment>
    <OpenableTableRow onOpen={() => setExpanded((value) => !value)}>
      <td data-label="Nhân viên">
        <strong>{row.employeeName}</strong>
        {tab === "attendance" && <span className={styles.secondary}>{row.job}</span>}
      </td>
      <td data-label="Vùng / bè">
        {zoneName(row.zoneId)}
        <span className={styles.secondary}>Bè {row.raftCode || "chưa xác định"}</span>
      </td>
      {tab === "assignments" ? (
        <td data-label="Công việc">{row.job}</td>
      ) : (
        <>
          <td data-label="Vào làm" className="whitespace-nowrap tabular-nums">
            {row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi nhận"}
          </td>
          <td data-label="Ra về" className="whitespace-nowrap tabular-nums">
            {row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi nhận"}
          </td>
        </>
      )}
      <td data-label="Trạng thái">
        <span className={styles.status} data-state={attendanceState(row)}>
          {attendanceLabel[attendanceState(row)]}
        </span>
      </td>
      <td data-label="Thao tác">
        <button type="button" className={styles.textAction} aria-expanded={expanded} aria-controls={`assignment-${row.id}`} onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn" : "Xem chi tiết"}</button>
        {canRemove || canCheckIn || canCheckOut ? (
          <details className={styles.rowActions}>
            <summary>Thao tác</summary>
            <div>
              {tab === "assignments" && (
                <p>
                  Vào: {row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi"}
                  <br />
                  Ra: {row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi"}
                </p>
              )}
              {canCheckIn && (
                <Button disabled={disabled} onClick={() => onAct(row, "check-in")}>
                  Vào làm
                </Button>
              )}
              {canCheckOut && (
                <Button variant="secondary" disabled={disabled} onClick={() => onAct(row, "check-out")}>
                  Ra về
                </Button>
              )}
              {canRemove && (
                <Button variant="secondary" disabled={disabled} onClick={() => onAct(row, "remove")}>
                  Gỡ phân công
                </Button>
              )}
            </div>
          </details>
        ) : (
          <span className={styles.secondary}>Chỉ xem</span>
        )}
      </td>
    </OpenableTableRow>
    {expanded && <tr><td colSpan={tab === "assignments" ? 5 : 6} className={styles.detailCell}>
      <section id={`assignment-${row.id}`} className={styles.assignmentDetail} aria-label={`Chi tiết phân công ${row.employeeName}`}>
        <header><div><small>PHÂN CÔNG · {formatVietnameseDate(row.date)}</small><h3>{row.employeeName}</h3></div><span className={styles.status} data-state={attendanceState(row)}>{attendanceLabel[attendanceState(row)]}</span></header>
        <dl>
          <div><dt>Vùng làm việc</dt><dd>{zoneName(row.zoneId)}</dd></div>
          <div><dt>Bè nuôi</dt><dd>{row.raftCode || "Chưa xác định"}</dd></div>
          <div><dt>Công việc được giao</dt><dd>{row.job}</dd></div>
          <div><dt>Vào làm</dt><dd>{row.checkedInAt ? displayTime(row.checkedInAt) : "Chưa ghi nhận"}</dd></div>
          <div><dt>Ra về</dt><dd>{row.checkedOutAt ? displayTime(row.checkedOutAt) : "Chưa ghi nhận"}</dd></div>
        </dl>
        <p>Giờ vào và ra là các lượt đã ghi nhận cho phân công này.</p>
      </section>
    </td></tr>}
    </Fragment>
  );
}
