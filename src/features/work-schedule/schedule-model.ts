import type { FunctionPermission } from "@/features/access/domain/function-permission";
import type { Assignment } from "@/features/operations/workforce-shared";
import { isDateOnly } from "@/shared/format/date-only";

/** `kind`: "Staff" (nội bộ, fixed zone) or "SeasonalWorker" (thời vụ, placed by assignment) when known. */
export type SchedulePerson = { id: string; name: string; code?: string; eligible: boolean; kind?: string };
export type DayState = { day: string; rows: Assignment[]; loading: boolean; error?: string };
export type ScheduleCell = { person: SchedulePerson; day: string; assignments: Assignment[] };
export type ScheduleAccess = (action: "View" | "Create" | "Edit" | "Delete", zoneId?: string) => boolean;

/** Function grants, including their zone scopes, are the only Staff authorization input. */
export function scheduleAllowed(identity: { subjectType: string }, grants: readonly FunctionPermission[], action: Parameters<ScheduleAccess>[0], zoneId?: string) {
  if (identity.subjectType === "CooperativeOwner") return true;
  return identity.subjectType === "Staff" && grants.some((grant) => grant.functionCode === "WORK_ASSIGNMENTS"
    && grant.action === action && grant.dataScope === "AssignedZone"
    && (grant.scope.kind === "all-zones" || (zoneId ? grant.scope.zoneIds.includes(zoneId) : grant.scope.zoneIds.length > 0)));
}

export function shiftDay(day: string, offset: number) {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function weekStart(day: string) {
  if (!isDateOnly(day)) throw new Error("Ngày không hợp lệ");
  return shiftDay(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
}
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));

/** Keep historical assignees even if they have since left the zone's active roster. */
export function schedulePeople(roster: SchedulePerson[], rows: Assignment[], zoneId: string) {
  const people = new Map(roster.map((person) => [person.id, person]));
  for (const row of rows.filter((entry) => entry.zoneId === zoneId)) {
    if (!people.has(row.employeeId)) people.set(row.employeeId, { id: row.employeeId, name: row.employeeName, eligible: false });
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export const assignmentLabel = (row: Assignment) => `${row.raftCode || "Cấp vùng"} · ${row.job}`;
/** Screen-reader name of a grid cell, e.g. "Nguyễn Văn A, Thứ Ba 25/11/2026: chưa có phân công" (an empty cell shows only "—"). */
export const cellAccessibleName = (person: string, weekday: string, date: string, assignments: readonly string[]) =>
  `${person}, ${weekday} ${date}: ${assignments.length ? assignments.join("; ") : "chưa có phân công"}`;
export const personDayKey = (employeeId: string, day: string) => `${employeeId}:${day}`;

/**
 * What an empty cell that cannot take a new assignment says, and the true reason: a past day is "đã qua", not "không có quyền".
 * undefined when the cell has assignments or can be saved.
 */
export function emptyCellMessage(cell: ScheduleCell, today: string, canSave: boolean): string | undefined {
  if (cell.assignments.length || canSave) return undefined;
  if (cell.day < today) return "Ngày đã qua, không thể thêm phân công.";
  if (!cell.person.eligible) return "Chưa có phân công.";
  return "Chưa có phân công. Bạn không có quyền tạo cho ô này.";
}

export function cellRights(cell: ScheduleCell, zoneId: string, today: string, allowed: ScheduleAccess) {
  const row = cell.assignments[0];
  const editable = cell.person.eligible && cell.day >= today && cell.assignments.length <= 1;
  return {
    save: editable && (row ? allowed("Edit", zoneId) && (cell.day === today || allowed("Create", zoneId)) : allowed("Create", zoneId)),
    remove: !!row && cell.assignments.length === 1 && cell.day >= today && !row.checkedInAt && !row.checkedOutAt && allowed("Delete", zoneId),
  };
}
