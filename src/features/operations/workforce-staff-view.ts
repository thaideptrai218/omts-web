import { attendanceLabel } from "./workforce-shared";
import type { StaffRow } from "./workforce-staff-actions";

/**
 * Presentation rules of the "Nhân viên nội bộ" tab, kept equal to the Phân công / Chấm công tabs:
 * same four attendance states (and so the same status colours and the same status filter), plus "Nghỉ phép đã duyệt" which only this tab has.
 */
export type StaffState = keyof typeof attendanceLabel;

export const staffState = (row: Pick<StaffRow, "checkedInAt" | "checkedOutAt">): StaffState =>
  row.checkedOutAt ? (row.checkedInAt ? "finished" : "missing") : row.checkedInAt ? "working" : "planned";

export const staffStateLabel = (row: Pick<StaffRow, "checkedInAt" | "checkedOutAt" | "onLeave">) =>
  row.onLeave && !row.checkedInAt && !row.checkedOutAt ? "Nghỉ phép đã duyệt" : attendanceLabel[staffState(row)];

/** The one-click step of a row: none while on approved leave or once the day is finished (same rule as QuickActionCell). */
export function staffStep(row: Pick<StaffRow, "checkedInAt" | "checkedOutAt" | "onLeave">): "check-in" | "check-out" | undefined {
  if (!row.checkedInAt && !row.checkedOutAt) return row.onLeave ? undefined : "check-in";
  return row.checkedInAt && !row.checkedOutAt ? "check-out" : undefined;
}

/** Search by name or code and the attendance-status filter of the shared filter rail. An employee on leave counts as "Chưa vào làm". */
export function filterStaffRows<T extends Pick<StaffRow, "employeeName" | "employeeCode" | "checkedInAt" | "checkedOutAt">>(rows: readonly T[], search: string, status: string): T[] {
  const term = search.trim().toLocaleLowerCase("vi-VN");
  return rows.filter(row => (!term || `${row.employeeName} ${row.employeeCode ?? ""}`.toLocaleLowerCase("vi-VN").includes(term)) && (!status || staffState(row) === status));
}

/** Why the Ghi buttons are absent; shown above the table so a read-only view is never a silent empty column. */
export function staffReadOnlyReason(day: string, today: string, canCreate: boolean): string | undefined {
  if (!canCreate) return "Bạn chỉ được xem chấm công nhân viên nội bộ. Quyền ghi vào làm và ra về do Chủ hợp tác xã cấp.";
  if (day !== today) return "Chỉ ghi vào làm và ra về trong ngày hôm nay. Ngày khác chỉ để xem.";
  return undefined;
}
