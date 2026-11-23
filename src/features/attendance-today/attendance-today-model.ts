import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { operationAllowed } from "@/features/operations/permissions";
import { attendanceLabel, type Assignment } from "@/features/operations/workforce-shared";
import { staffState, staffStep } from "@/features/operations/workforce-staff-view";
import type { TodaySnapshot } from "./attendance-today-service";

export type AttendanceStep = "check-in" | "check-out";
export type TodayPerson = {
  key: string; id: string; employeeId: string; name: string; code?: string | null;
  source: "assignment" | "staff"; day: string; zoneIds: string[];
  checkedInAt: string | null; checkedOutAt: string | null; onLeave?: boolean; assignment?: Assignment; overnightAssignment?: Assignment;
};
export type TodayCrew = { key: string; label: string; people: TodayPerson[] };
export type AttendanceAllowed = (action: "View" | "AttendanceCreate", zoneId?: string) => boolean;
export const todayState = staffState;
export const todayLabel = (row: TodayPerson) => row.onLeave && todayState(row) === "planned" ? "Nghỉ phép đã duyệt" : attendanceLabel[todayState(row)];
export const isPreviousOpen = (row: TodayPerson, day: string) => row.day < day && !!row.checkedInAt && !row.checkedOutAt;

export function attendanceAccess(identity: { subjectType: string }, permissions: readonly FunctionPermission[]): AttendanceAllowed {
  return (action, zoneId) => operationAllowed("workforce", identity, permissions, action, zoneId);
}

/** Never widen the zone picker with arbitrary zones found in a response. */
export function grantedZones<T extends { id: string }>(zones: readonly T[], allowed: AttendanceAllowed) {
  return zones.filter(zone => allowed("View", zone.id));
}

/** Staff with a day record live in the internal group once, even when also present in assignments. */
export function todayPeople(snapshot: TodaySnapshot, day: string, zoneId: string, allowed: AttendanceAllowed): TodayPerson[] {
  const scopes = new Map(snapshot.scope.map(row => [row.id, row.zoneIds.filter(id => allowed("View", id))]));
  const staff: TodayPerson[] = snapshot.staff.flatMap(row => {
    const zoneIds = scopes.get(row.employeeId) ?? [];
    const overnightAssignment = snapshot.assignments.find(item => item.employeeId === row.employeeId && item.date === row.date && item.date < day
      && !!item.checkedInAt && !item.checkedOutAt && allowed("View", item.zoneId) && (!zoneId || item.zoneId === zoneId));
    return zoneIds.length && (!zoneId || zoneIds.includes(zoneId)) ? [{ ...row, key: `staff:${row.employeeId}:${row.date}`, id: row.employeeId,
      employeeId: row.employeeId, name: row.employeeName, code: row.employeeCode, day: row.date, zoneIds, source: "staff" as const, overnightAssignment }] : [];
  });
  const staffDays = new Set(staff.map(row => `${row.employeeId}:${row.day}`));
  const assignments: TodayPerson[] = snapshot.assignments.filter(row => allowed("View", row.zoneId) && (!zoneId || row.zoneId === zoneId)
    && !staffDays.has(`${row.employeeId}:${row.date}`)).map(row => ({ key: `assignment:${row.id}`, id: row.id, employeeId: row.employeeId,
    name: row.employeeName, day: row.date, zoneIds: [row.zoneId], source: "assignment", checkedInAt: row.checkedInAt,
    checkedOutAt: row.checkedOutAt, onLeave: row.onLeave, assignment: row }));
  return [...new Map([...assignments, ...staff].filter(row => row.day === day || isPreviousOpen(row, day)).map(row => [row.key, row])).values()];
}

export function searchPeople(people: readonly TodayPerson[], search: string, zoneName: (id: string) => string) {
  const term = search.trim().toLocaleLowerCase("vi-VN");
  return people.filter(row => !term || [row.name, row.code, row.assignment?.job, row.assignment?.raftCode,
    ...row.zoneIds.map(zoneName), row.source === "staff" ? "Nhân viên nội bộ" : ""].join(" ").toLocaleLowerCase("vi-VN").includes(term));
}

export function groupPeople(people: readonly TodayPerson[], zoneName: (id: string) => string): TodayCrew[] {
  const groups = new Map<string, TodayCrew>();
  for (const row of people) {
    const assignment = row.assignment;
    const key = assignment ? `${assignment.zoneId}:${assignment.raftId ?? "zone"}` : "staff";
    const label = assignment ? (assignment.raftCode ? `Bè ${assignment.raftCode} · ${zoneName(assignment.zoneId)}` : zoneName(assignment.zoneId)) : "Nhân viên nội bộ";
    const group = groups.get(key) ?? { key, label, people: [] };
    group.people.push(row); groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.key === "staff" ? 1 : b.key === "staff" ? -1 : a.label.localeCompare(b.label, "vi"));
}

export function offeredStep(row: TodayPerson, day: string, zoneId: string, allowed: AttendanceAllowed): AttendanceStep | undefined {
  const zones = zoneId ? row.zoneIds.filter(id => id === zoneId) : row.zoneIds;
  // Staff's endpoint has no zone parameter; still require a grant in a visible working zone.
  if (!zones.some(id => allowed("AttendanceCreate", id))) return undefined;
  // Only assignment checkout has a documented overnight target; staff checkout accepts no date.
  if (isPreviousOpen(row, day)) return row.source === "assignment" || row.overnightAssignment && allowed("AttendanceCreate", row.overnightAssignment.zoneId) ? "check-out" : undefined;
  if (row.day !== day) return undefined;
  const step = staffStep(row);
  if (step === "check-in" && row.assignment && !row.assignment.jobTypeId) return undefined;
  return step;
}

export function attendanceSummary(people: readonly TodayPerson[], day: string, now = Date.now()) {
  const unique = (rows: readonly TodayPerson[]) => new Set(rows.map(row => row.employeeId)).size;
  const working = people.filter(row => todayState(row) === "working");
  const workingIds = new Set(working.map(row => row.employeeId));
  return { total: unique(people), working: unique(working), waiting: unique(people.filter(row => todayState(row) === "planned" && !workingIds.has(row.employeeId))),
    unclosed: unique(working.filter(row => isPreviousOpen(row, day) || now - Date.parse(row.checkedInAt!) > 12 * 3_600_000)) };
}
