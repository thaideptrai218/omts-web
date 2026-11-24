import { z } from "zod";
import { employeePageSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { assignmentSchema } from "@/features/operations/new-module-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { staffAttendanceSchema, crewStartSchema } from "@/features/operations/workforce-contracts";
import { workforceRepository } from "@/features/operations/workforce-shared";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";

const employees = createOperationsRepository("employees");
export type StaffScope = { id: string; zoneIds: string[] };
export function previousDay(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** The attendance response has no zone: use the existing, permission-scoped HR list to join working zones. */
async function readStaffScope(signal: AbortSignal): Promise<WorkspaceResult<StaffScope[]>> {
  const rows: StaffScope[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await employees.read("list", { employeeType: "Staff", page: String(page), pageSize: "100" }, employeePageSchema, signal);
    if (result.status === "error") return result;
    rows.push(...result.data.items.map(row => ({ id: row.id, zoneIds: row.workingZones.map(zone => zone.id) })));
    if (page * 100 >= result.data.total) return { status: "success", data: rows };
  }
  return { status: "error", httpStatus: 0, uncertain: false };
}

/** One snapshot: never show successful-looking counters when one of the attendance sources failed. */
export async function readAttendanceToday(day: string, signal: AbortSignal) {
  const yesterday = previousDay(day);
  const [today, carry, staff, staffCarry, scope] = await Promise.all([
    workforceRepository.read("list", { day }, z.array(assignmentSchema), signal),
    workforceRepository.read("list", { day: yesterday }, z.array(assignmentSchema), signal),
    workforceRepository.read("staff", { day }, z.array(staffAttendanceSchema), signal),
    workforceRepository.read("staff", { day: yesterday }, z.array(staffAttendanceSchema), signal),
    readStaffScope(signal),
  ]);
  if (today.status === "error") return today;
  if (carry.status === "error") return carry;
  if (staff.status === "error") return staff;
  if (staffCarry.status === "error") return staffCarry;
  if (scope.status === "error") return scope;
  return { status: "success" as const, data: { assignments: [...today.data, ...carry.data], staff: [...staff.data, ...staffCarry.data], scope: scope.data } };
}

export type TodaySnapshot = Extract<Awaited<ReturnType<typeof readAttendanceToday>>, { status: "success" }>["data"];
export function startCrew(payload: z.infer<typeof crewStartSchema>, zoneId: string) {
  return workforceRepository.write("crew-start", crewStartSchema.parse(payload), z.array(assignmentSchema), undefined, zoneId);
}

export function recordAttendance(source: "assignment" | "staff", id: string, step: "check-in" | "check-out", zoneId?: string) {
  return source === "staff"
    ? workforceRepository.write(`staff-${step}`, { qrCode: null }, staffAttendanceSchema, id)
    : workforceRepository.write(step, { qrCode: null }, assignmentSchema, id, zoneId);
}
