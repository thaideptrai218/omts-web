import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function readCycles<T>(query: Record<string,string>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/cultivation-cycles?${new URLSearchParams(query)}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const body = await response.json(), parsed = schema.safeParse(body.data);
    return response.ok && body.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.status, code: body.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
export async function writeCycle(action: "start" | "edit" | "cancel", id: string, body: unknown): Promise<WorkspaceResult<unknown>> {
  try {
    const response = await fetch("/api/cultivation-cycles", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000), headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify({ action, id, body }) });
    const value = await response.json();
    return response.ok && value.status === "success" ? { status: "success", data: value.data } : { status: "error", httpStatus: response.status, code: value.code, uncertain: response.ok || response.status >= 500 || response.status === 401 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}
