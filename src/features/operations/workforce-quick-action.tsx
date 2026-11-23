"use client";
import { Button } from "@/components/ui/button";
import { businessToday } from "./ui";
import { attendanceActionLabel, isCarryOver, type Assignment, type AssignmentAction } from "./workforce-shared";

/** The one-click attendance step a closed row offers: check-in when nothing is recorded, check-out while it is open; nothing otherwise. */
export function quickAttendanceAction(row: Assignment, allowed: (action: string, zoneId?: string) => boolean): Exclude<AssignmentAction, "remove"> | undefined {
  const today = businessToday();
  if (!allowed("AttendanceCreate", row.zoneId) || !(row.date === today || isCarryOver(row, today))) return undefined;
  if (!row.checkedInAt && !row.checkedOutAt) return row.jobTypeId ? "check-in" : undefined;
  return row.checkedInAt && !row.checkedOutAt ? "check-out" : undefined;
}

/** Cell with the one-click "Vào làm" / "Ra về" button of a row; the click never opens the row. */
export function QuickActionCell({ row, allowed, disabled, pending, onAct }: {
  row: Assignment; allowed(action: string, zoneId?: string): boolean; disabled: boolean; pending: boolean; onAct(row: Assignment, action: AssignmentAction): void;
}) {
  const action = quickAttendanceAction(row, allowed);
  return <td onClick={(event) => event.stopPropagation()}>
    {action && <Button type="button" className="w-auto whitespace-nowrap" variant={action === "check-in" ? "primary" : "secondary"} disabled={disabled} isPending={pending}
      aria-label={`${attendanceActionLabel[action]} cho ${row.employeeName}`} onClick={() => onAct(row, action)}>{attendanceActionLabel[action]}</Button>}
  </td>;
}
