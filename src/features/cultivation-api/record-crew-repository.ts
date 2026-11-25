import { createOperationsRepository } from "@/features/operations/repository";
import { workforceLookupsSchema } from "@/features/operations/new-module-contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { z } from "zod";
import { crewSuggestions } from "./record-crew-contracts";

/** `busy` is set when the employee is already assigned to another place that day: the picker shows who and where, and does not offer them. */
export type CrewOption = { id: string; name: string; preferred: boolean; busy?: string; /** "Staff" or "SeasonalWorker" when the lookup says. */ kind?: string };
type Assigned = { zoneId: string; raftId: string | null; raftCode: string | null; job: string } | null | undefined;
function busyText(assignment: Assigned, raftId: string | undefined, zoneId: string): string | undefined {
  if (!assignment) return undefined;
  const here = raftId ? assignment.raftId === raftId : assignment.raftId === null && assignment.zoneId === zoneId;
  return here ? undefined : `Đã phân công hôm nay ${assignment.raftCode ? `ở bè ${assignment.raftCode}` : "ở một vùng khác"} (${assignment.job})`;
}
const harvest = createOperationsRepository("harvest"), workforce = createOperationsRepository("workforce");
const sorted = (items: CrewOption[]) => items.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.name.localeCompare(b.name, "vi"));
/**
 * Employees to pick for a harvest. The backend's suggestions (assigned to this raft that day) come first; every active employee
 * from the workforce lookups stays selectable. A user without workforce access still gets the suggestions.
 */
export async function readRecordCrew(raftId: string | undefined, zoneId: string, day: string, signal?: AbortSignal): Promise<WorkspaceResult<CrewOption[]>> {
  // A nursery has no raft: nobody is "assigned to it", so only the lookups apply.
  const noSuggestions: WorkspaceResult<z.infer<typeof crewSuggestions>> = { status: "error", httpStatus: 404, uncertain: false };
  const [suggested, lookups] = await Promise.all([
    raftId ? harvest.read("crew-suggestions", { id: raftId, zoneId, date: day }, crewSuggestions, signal) : Promise.resolve(noSuggestions),
    workforce.read("lookups", { day }, workforceLookupsSchema, signal),
  ]);
  const preferred = new Map(suggested.status === "success" ? suggested.data.employees.map(item => [item.id, item.name]) : []);
  if (lookups.status === "success") {
    const all = new Map(lookups.data.employees.map(item => [item.id, item.name]));
    const assigned = new Map(lookups.data.employees.map(item => [item.id, item.assignment]));
    const kinds = new Map(lookups.data.employees.map(item => [item.id, item.type ?? undefined]));
    for (const [id, name] of preferred) all.set(id, name);
    return { status: "success", data: sorted([...all].map(([id, name]) => ({ id, name, preferred: preferred.has(id), kind: kinds.get(id), busy: preferred.has(id) ? undefined : busyText(assigned.get(id), raftId, zoneId) }))) };
  }
  if (suggested.status === "success") return { status: "success", data: sorted([...preferred].map(([id, name]) => ({ id, name, preferred: true }))) };
  // Both reads failed: a missing endpoint is a quiet empty list, any other failure keeps its message.
  if (suggested.httpStatus === 404 && lookups.httpStatus === 404) return { status: "success", data: [] };
  return suggested.httpStatus === 404 ? lookups : suggested;
}
