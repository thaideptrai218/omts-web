import { bffFetch } from "@/features/auth/api/bff-fetch";
import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { cultivationLog } from "./log-contracts";
export async function logRequest<T>(action: string, id: string, schema: z.ZodType<T>, body?: unknown, files?: File[], signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    let payload: BodyInit | undefined; const headers: Record<string,string> = { Accept: "application/json" };
    if (body !== undefined) { headers["X-OMTS-Request"] = "web"; if (files) { const form = new FormData(); form.set("payload", JSON.stringify(body)); files.forEach(file => form.append("files", file)); payload = form; } else { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); } }
    const response = await bffFetch(`/api/cultivation-logs?${new URLSearchParams({ action, id })}`, { method: body === undefined ? "GET" : "POST", body: payload, headers, credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(60_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: body !== undefined && (response.ok || response.status >= 500 || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: body !== undefined }; }
}
export const logListSchema = z.array(cultivationLog);
export const logSavedSchema = z.object({ log: cultivationLog });
