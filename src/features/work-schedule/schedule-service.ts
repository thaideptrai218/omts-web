import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { employeePageSchema } from "@/features/employee-management/api/employee-contract.schemas";
import { loadOptions } from "@/features/operations/lookups";
import { assignWorkSchema, assignmentSchema, crewWorkSchema, workforceLookupsSchema } from "@/features/operations/new-module-contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { workforceRepository } from "@/features/operations/workforce-shared";
import type { SchedulePerson } from "./schedule-model";

const employees = createOperationsRepository("employees");
const done = z.object({ done: z.literal(true) });
export type ScheduleDraft = { employeeId: string; zoneId: string; raftId: string; jobTypeId: string; day: string };

/** UI calls these contracts; HTTP and BFF mapping stay in the existing repositories. */
/**
 * Seasonal workers have no working zone, so the zone filter above never lists them; they can be placed in any zone by assignment, so they are read apart. A refusal or failure here
 * leaves the roster of the zone as it is (the schedule still works for its own staff).
 */
async function seasonalPeople(signal: AbortSignal): Promise<SchedulePerson[]> {
  const found: SchedulePerson[] = [];
  for (let page = 1; page <= 20; page++) {
    const result = await employees.read("list", { employeeType: "SeasonalWorker", statusId: "401", page: String(page), pageSize: "100" }, employeePageSchema, signal);
    if (result.status !== "success") return [];
    for (const person of result.data.items) if (person.status === "Employed") found.push({ id: person.id, name: person.fullName, code: person.code, eligible: true, kind: "SeasonalWorker" });
    if (page * 100 >= result.data.total) break;
  }
  return found;
}

export const scheduleService = {
  zones: (signal: AbortSignal) => loadOptions("zones", signal),
  rafts: (zoneId: string, signal: AbortSignal) => loadOptions("rafts", signal, { zoneId, statusId: "101" }),
  day: (day: string, signal: AbortSignal) => workforceRepository.read("list", { day }, z.array(assignmentSchema), signal),
  lookups: (day: string, signal: AbortSignal) => workforceRepository.read("lookups", { day }, workforceLookupsSchema, signal),
  async people(zoneId: string, signal: AbortSignal): Promise<WorkspaceResult<SchedulePerson[]>> {
    const people = new Map<string, SchedulePerson>();
    for (let page = 1; page <= 100; page++) {
      if (signal.aborted) return { status: "error", httpStatus: 0, uncertain: false };
      const result = await employees.read("list", { zoneId, statusId: "401", page: String(page), pageSize: "100" }, employeePageSchema, signal);
      if (result.status !== "success") return result;
      for (const person of result.data.items) {
        if (person.status === "Employed" && person.workingZones.some((zone) => zone.id === zoneId)) {
          people.set(person.id, { id: person.id, name: person.fullName, code: person.code, eligible: true, kind: person.employeeType ?? undefined });
        }
      }
      if (page * 100 >= result.data.total) return { status: "success", data: [...people.values(), ...await seasonalPeople(signal)] };
    }
    return { status: "error", httpStatus: 0, uncertain: false };
  },
  create(draft: ScheduleDraft, moveExisting = false) {
    const payload = assignWorkSchema.parse({ ...(draft.raftId ? { raftId: draft.raftId } : { zoneId: draft.zoneId }),
      date: draft.day, jobTypeId: draft.jobTypeId, employeeIds: [draft.employeeId], moveExisting });
    return workforceRepository.write("assign", payload, z.array(assignmentSchema), undefined, draft.zoneId);
  },
  changeToday(draft: ScheduleDraft) {
    const payload = crewWorkSchema.parse({ ...(draft.raftId ? { raftId: draft.raftId } : { zoneId: draft.zoneId }),
      jobTypeId: draft.jobTypeId, employeeIds: [draft.employeeId] });
    return workforceRepository.write("crew", payload, done, undefined, draft.zoneId);
  },
  remove: (id: string, zoneId: string) => workforceRepository.write("remove", {}, done, id, zoneId),
};
