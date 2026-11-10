import { bffFetch } from "@/features/auth/api/bff-fetch";
import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function certificationRequest<T>(action: "list"|"create"|"update"|"remove", schema: z.ZodType<T>, id?: string, input?: unknown, file?: File, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    let body: BodyInit | undefined; const headers: Record<string,string> = { Accept: "application/json" };
    if (action !== "list") { headers["X-OMTS-Request"] = "web"; if (action === "remove") { headers["Content-Type"] = "application/json"; body = JSON.stringify(input); } else { const form = new FormData(); form.set("payload", JSON.stringify(input)); if (file) form.append("files", file); body = form; } }
    const response = await bffFetch(`/api/cooperative/certifications?${new URLSearchParams({ action, ...(id ? { id } : {}) })}`, { method: action === "list" ? "GET" : "POST", body, headers, credentials: "same-origin", redirect: "error", cache: "no-store", signal: signal ?? AbortSignal.timeout(60_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: action !== "list" && (response.ok || response.status >= 500 || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: action !== "list" }; }
}
