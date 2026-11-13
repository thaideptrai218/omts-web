import { createOperationsRepository } from "@/features/operations/repository";
import { workforceLookupsSchema } from "@/features/operations/new-module-contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { crewSuggestions } from "./harvest-crew-contracts";

export type CrewOption = { id: string; name: string; preferred: boolean };
const harvest = createOperationsRepository("harvest"), workforce = createOperationsRepository("workforce");
const sorted = (items: CrewOption[]) => items.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.name.localeCompare(b.name, "vi"));
/**
 * Employees to pick for a harvest. The backend's suggestions (assigned to this raft that day) come first; every active employee
 * from the workforce lookups stays selectable. A user without workforce access still gets the suggestions.
 */
export async function readHarvestCrew(raftId: string, zoneId: string, day: string, signal?: AbortSignal): Promise<WorkspaceResult<CrewOption[]>> {
  const [suggested, lookups] = await Promise.all([
    harvest.read("crew-suggestions", { id: raftId, zoneId, date: day }, crewSuggestions, signal),
    workforce.read("lookups", { day }, workforceLookupsSchema, signal),
  ]);
  const preferred = new Map(suggested.status === "success" ? suggested.data.employees.map(item => [item.id, item.name]) : []);
  if (lookups.status === "success") {
    const all = new Map(lookups.data.employees.map(item => [item.id, item.name]));
    for (const [id, name] of preferred) all.set(id, name);
    return { status: "success", data: sorted([...all].map(([id, name]) => ({ id, name, preferred: preferred.has(id) }))) };
  }
  if (suggested.status === "success") return { status: "success", data: sorted([...preferred].map(([id, name]) => ({ id, name, preferred: true }))) };
  // Both reads failed: a missing endpoint is a quiet empty list, any other failure keeps its message.
  if (suggested.httpStatus === 404 && lookups.httpStatus === 404) return { status: "success", data: [] };
  return suggested.httpStatus === 404 ? lookups : suggested;
}
