import { z } from "zod";
import { projectFarmingProblem } from "@/features/cultivation-api/farming-problem";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { harvestList } from "@/features/cultivation-api/records-contracts";
import { laneIncidentHistory, laneIncidentSaved, type IncidentAction } from "./lane-incident-contracts";

type Target = { id: string; zoneId: string; laneNumber: number };
async function send<T>(action: string, target: Target, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal, incidentId?: string): Promise<WorkspaceResult<T>> {
  try {
    const query = new URLSearchParams({ action: `lane-${action}`, id: target.id, zoneId: target.zoneId, laneNumber: String(target.laneNumber), ...(incidentId ? { incidentId } : {}) });
    const form = body instanceof FormData;
    const response = await bffFetch(`/api/operations/raft-details?${query}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "X-OMTS-Request": "web", ...(!form ? { "Content-Type": "application/json" } : {}) }) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(60_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    if (response.ok && value.status === "success" && parsed.success) return { status: "success", data: parsed.data };
    const problem = projectFarmingProblem(value.problem);
    return { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, ...(problem ? { problem } : {}), uncertain: body !== undefined && (response.ok || response.status >= 500 || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: body !== undefined }; }
}
export const laneIncidentRepository = {
  history: (target: Target, signal?: AbortSignal) => send("history", target, laneIncidentHistory, undefined, signal),
  save: (action: IncidentAction, target: Target, body: unknown, photos?: File[]) => {
    if (action !== "damage") return send(action, target, laneIncidentSaved, body);
    const form = new FormData(); form.set("payload", JSON.stringify(body));
    for (const file of photos ?? []) form.append("files", file, file.name);
    return send(action, target, laneIncidentSaved, form);
  },
  async photo(target: Target, incidentId: string, file: File) {
    const form = new FormData(); form.set("payload", "{}"); form.append("photo", file, file.name);
    // A successful upload is deliberately independent of the mutation, so a failed photo never repeats stock deduction.
    return send("photo", target, z.object({ done: z.literal(true) }), form, undefined, incidentId);
  },
  cycle: (id: string, zoneId: string, signal?: AbortSignal) => createOperationsRepository("harvest").read("list", { id, zoneId }, harvestList, signal),
};
