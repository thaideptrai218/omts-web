import { z } from "zod";
import type { ManagedAccount, AssignableRole, FarmingZoneOption } from "@/features/account-management/domain/account-management";
import type { EmployeeProfile } from "@/features/employee-management/domain/employee-management";
import type { RaftProfile } from "@/features/rafts/domain/raft";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { vietnameseBusinessDate } from "@/shared/format/date-only";

type Sources = { accounts(): readonly ManagedAccount[]; roles(): readonly AssignableRole[]; zones(): readonly FarmingZoneOption[]; employees(): readonly EmployeeProfile[]; rafts(): readonly RaftProfile[] };
export type DemoAssignment = { id: string; zoneId: string; raftId: string; employeeId: string; employeeName: string; date: string; job: string; checkedInAt: string | null; checkedOutAt: string | null; version: number };
export const demoJobs = ["Thu hoạch", "Chăm sóc bè", "Đo nước"] as const;
const inputSchema = z.strictObject({ raftId: z.string().min(1), date: z.iso.date(), job: z.enum(demoJobs), employeeIds: z.array(z.string().min(1)).min(1).max(100).refine((ids) => new Set(ids).size === ids.length) });
export function createDemoWorkforceRepository(sources: Sources, now = () => new Date()) {
  let rows: DemoAssignment[] = [];
  const failure = (httpStatus: number): WorkspaceResult<never> => ({ status: "error", httpStatus, uncertain: false });
  const success = <T>(data: T): WorkspaceResult<T> => ({ status: "success", data: structuredClone(data) });
  function scope(accountId: string) {
    // The legacy local Manager login represents the same seeded eastern manager.
    const effectiveId = accountId === "account-staff-verified" ? "account-nguyen-an" : accountId;
    const account = sources.accounts().find((row) => row.id === effectiveId && row.status === "active");
    if (!account) return [];
    if (account.accountType === "cooperative-owner") return sources.zones().filter((zone) => zone.status === "in-use").map((zone) => zone.id);
    if (account.accountType !== "internal") return [];
    const today = vietnameseBusinessDate(now());
    const grants = account.grants.filter((grant) => grant.roleId === "role-zone-manager" && grant.status === "effective" && grant.effectiveFrom <= today && (!grant.effectiveTo || grant.effectiveTo >= today) && sources.roles().some((role) => role.id === grant.roleId && role.status === "in-use"));
    return sources.zones().filter((zone) => zone.status === "in-use" && grants.some((grant) => grant.zoneId === null || grant.zoneId === zone.id)).map((zone) => zone.id);
  }
  return {
    async load(accountId: string, day: string) {
      const zoneIds = scope(accountId);
      if (!zoneIds.length) return failure(403);
      if (!z.iso.date().safeParse(day).success) return failure(400);
      return success({ zones: sources.zones().filter((zone) => zoneIds.includes(zone.id)), rafts: sources.rafts().filter((raft) => zoneIds.includes(raft.zoneId) && raft.status === "in-use"), employees: sources.employees().filter((employee) => employee.status === "employed" && employee.workingZoneIds.some((zone) => zoneIds.includes(zone))).map((employee) => ({ id: employee.id, name: employee.fullName, zoneIds: employee.workingZoneIds.filter((zone) => zoneIds.includes(zone)) })), assignments: rows.filter((row) => row.date === day && zoneIds.includes(row.zoneId)) });
    },
    async assign(accountId: string, input: unknown): Promise<WorkspaceResult<true>> {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success || parsed.data.date < vietnameseBusinessDate(now())) return failure(400);
      const value = parsed.data, raft = sources.rafts().find((row) => row.id === value.raftId && row.status === "in-use");
      if (!raft || !scope(accountId).includes(raft.zoneId)) return failure(403);
      const employees = value.employeeIds.map((id) => sources.employees().find((employee) => employee.id === id && employee.status === "employed" && employee.workingZoneIds.includes(raft.zoneId)));
      if (employees.some((employee) => !employee)) return failure(400);
      if (rows.some((row) => row.date === value.date && value.employeeIds.includes(row.employeeId))) return failure(409);
      rows.push(...employees.map((employee) => ({ id: crypto.randomUUID(), zoneId: raft.zoneId, raftId: raft.id, employeeId: employee!.id, employeeName: employee!.fullName, date: value.date, job: value.job, checkedInAt: null, checkedOutAt: null, version: 1 })));
      return success(true);
    },
    async act(accountId: string, id: string, version: number, action: "remove" | "check-in" | "check-out"): Promise<WorkspaceResult<true>> {
      const row = rows.find((item) => item.id === id);
      if (!row || !scope(accountId).includes(row.zoneId)) return failure(403);
      if (row.version !== version) return failure(409);
      const today = vietnameseBusinessDate(now());
      if (action === "remove") {
        if (row.date < today || row.checkedInAt || row.checkedOutAt) return failure(400);
        rows = rows.filter((item) => item.id !== id);
      } else {
        if (row.date !== today || row.checkedOutAt || action === "check-in" && row.checkedInAt) return failure(400);
        if (action === "check-in") row.checkedInAt = now().toISOString(); else row.checkedOutAt = now().toISOString();
        row.version++;
      }
      return success(true);
    },
  };
}
