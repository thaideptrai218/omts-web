import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function adminRequest<T>(query: URLSearchParams, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/admin/accounts?${query}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "same-origin", redirect: "error", signal: signal ?? AbortSignal.timeout(30000), headers: body === undefined ? {} : { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json();
    if (response.ok && value.status === "success") { const parsed = schema.safeParse(value.data); if (parsed.success) return { status: "success", data: parsed.data }; }
    return { status: "error", httpStatus: response.status, code: value.code, uncertain: body !== undefined && (response.ok || response.status >= 500 || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: body !== undefined }; }
}
