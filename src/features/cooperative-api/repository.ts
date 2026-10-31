import { cooperativeViewSchema, type CooperativeInput, type CooperativeView } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";

async function send(method: "GET" | "PUT" | "POST" | "DELETE", body?: CooperativeInput | File, signal?: AbortSignal): Promise<WorkspaceResult<CooperativeView>> {
  const writing = method !== "GET", logo = method === "POST" || method === "DELETE";
  try {
    const form = body instanceof File ? new FormData() : undefined;
    if (form && body instanceof File) form.set("file", body, body.name);
    const response = await fetch(`/api/cooperative/profile${logo ? "/logo" : ""}`, { method, credentials: "same-origin", redirect: "error", cache: "no-store", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(writing ? { "X-OMTS-Request": "web" } : {}), ...(body && !form ? { "Content-Type": "application/json" } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
    const result = await response.json();
    if (response.status === 200 && result.status === "success") {
      const parsed = cooperativeViewSchema.safeParse(result.data);
      if (parsed.success) return { status: "success", data: parsed.data };
    }
    return { status: "error", httpStatus: response.status, code: typeof result.code === "string" ? result.code : undefined,
      uncertain: writing && (response.status >= 500 || response.ok || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: writing }; }
}
export function createCooperativeRepository() {
  return { read: (signal?: AbortSignal) => send("GET", undefined, signal), save: (body: CooperativeInput) => send("PUT", body),
    upload: (file: File) => send("POST", file), remove: () => send("DELETE") };
}
