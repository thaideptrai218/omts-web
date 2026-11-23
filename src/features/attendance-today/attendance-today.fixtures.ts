import type { Assignment } from "@/features/operations/workforce-shared";
import type { StaffAttendance } from "@/features/operations/workforce-contracts";
import type { TodaySnapshot } from "./attendance-today-service";

export const ids = { zone: "11111111-1111-4111-8111-111111111111", other: "22222222-2222-4222-8222-222222222222",
  raft: "33333333-3333-4333-8333-333333333333", worker: "44444444-4444-4444-8444-444444444444",
  staff: "55555555-5555-4555-8555-555555555555", job: "66666666-6666-4666-8666-666666666666", assignment: "77777777-7777-4777-8777-777777777777" };

export function assignment(day: string, patch: Partial<Assignment> = {}): Assignment {
  return { id: ids.assignment, employeeId: ids.worker, employeeName: "Nguyễn An", zoneId: ids.zone, raftId: ids.raft, raftCode: "B01",
    jobTypeId: ids.job, job: "Vệ sinh lồng", date: day, checkedInAt: null, checkedOutAt: null, workedMinutes: null, breakMinutes: null, ...patch };
}

export function staff(day: string, patch: Partial<StaffAttendance> = {}): StaffAttendance {
  return { employeeId: ids.staff, employeeName: "Trần Bình", employeeCode: "NV02", date: day, checkedInAt: null, checkedOutAt: null, ...patch };
}

export function snapshot(day: string, patch: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return { assignments: [assignment(day)], staff: [staff(day)], scope: [{ id: ids.staff, zoneIds: [ids.zone] }], ...patch };
}
