import type { Assignment } from "@/features/operations/workforce-shared";

// Deterministic identities for the schedule's unit/component tests only.
export const testIds = { zone: "10000000-0000-4000-8000-000000000001", otherZone: "10000000-0000-4000-8000-000000000002",
  person: "20000000-0000-4000-8000-000000000001", secondPerson: "20000000-0000-4000-8000-000000000002",
  job: "30000000-0000-4000-8000-000000000001", raft: "40000000-0000-4000-8000-000000000001" };
export function testAssignment(patch: Partial<Assignment> = {}): Assignment {
  return { id: "50000000-0000-4000-8000-000000000001", employeeId: testIds.person, employeeName: "Nguyễn An", zoneId: testIds.zone,
    raftId: testIds.raft, raftCode: "BE01", jobTypeId: testIds.job, job: "Vệ sinh", date: "2026-11-23", checkedInAt: null, checkedOutAt: null,
    workedMinutes: null, breakMinutes: null, ...patch };
}
