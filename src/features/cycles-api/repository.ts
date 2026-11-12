import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { projectFarmingProblem } from "@/features/cultivation-api/farming-problem";
import { closePreview, closedCycle, cycleFigures, type CloseValues, type ClosedCycle } from "./close-contracts";

export async function readCycles<T>(query: Record<string,string>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch(`/api/cultivation-cycles?${new URLSearchParams(query)}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const body = await response.json(), parsed = schema.safeParse(body.data);
    return response.ok && body.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.status, code: body.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
export async function writeCycle(action: "start" | "edit" | "cancel" | "close" | "plan-photos", id: string, body: unknown): Promise<WorkspaceResult<unknown>> {
  try {
    const form = body instanceof FormData ? body : undefined;
    if (form) { form.set("action", action); form.set("id", id); }
    const response = await bffFetch("/api/cultivation-cycles", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), headers: { ...(!form ? { "Content-Type": "application/json" } : {}), "X-OMTS-Request": "web" }, body: form ?? JSON.stringify({ action, id, body }) });
    const value = await response.json();
    const problem = projectFarmingProblem(value.problem);
    return response.ok && value.status === "success" ? { status: "success", data: value.data } : { status: "error", httpStatus: response.status, code: value.code, ...(problem ? { problem } : {}), uncertain: response.ok || response.status >= 500 || response.status === 401 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}
/** Plan vs actual figures of a cycle (an open cycle as if it closed today). */
export const readCycleSummary = (cycleId: string, signal?: AbortSignal) => readCycles({ action: "summary", cycleId }, cycleFigures, signal);
/** What the close would do: figures, early or not, whether a Zone Manager needs the Owner's approval, and the row version to send. */
export const readClosePreview = (cycleId: string, signal?: AbortSignal) => readCycles({ action: "close-preview", cycleId }, closePreview, signal);
/** Closes the cycle (CYCLE-06). A 409 carries `problem.confirmFlag === "ownerApproved"` when a Zone Manager closes early without approval. */
export async function closeCycle(cycleId: string, values: CloseValues): Promise<WorkspaceResult<ClosedCycle>> {
  const result = await writeCycle("close", cycleId, values);
  if (result.status !== "success") return result;
  const parsed = closedCycle.safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: 502, uncertain: true };
}
