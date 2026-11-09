"use client";
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
  const canRemove =
    row.date >= businessToday() && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", row.zoneId);
  const canAttend = row.date === businessToday() && allowed("AttendanceCreate", row.zoneId);
  const canCheckIn = canAttend && !row.checkedInAt && !row.checkedOutAt && !!row.jobTypeId && !!row.raftId;
  const canCheckOut = canAttend && !row.checkedOutAt;

  return (
    <tr>
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
    </tr>
  );
}
