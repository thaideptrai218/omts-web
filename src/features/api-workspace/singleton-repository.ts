import type { SingletonKey } from "./singleton-contract";
import type { WorkspaceResult } from "./workspace-repository";
export function createSingletonRepository(key: SingletonKey) {
  const path = key === "profile" ? "/api/account/profile" : "/api/cooperative/profile";
  async function send(body?: Record<string, unknown>, signal?: AbortSignal): Promise<WorkspaceResult<Record<string, unknown>>> {
    try {
      const response = await fetch(path, { method: body ? "PUT" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000),
        headers: body ? { "X-OMTS-Request": "web", "Content-Type": "application/json" } : { Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const value = await response.json();
      return response.ok && value.status === "success" ? { status: "success", data: value.data }
        : { status: "error", code: value.code, httpStatus: response.status, uncertain: response.status >= 500 };
    } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
  }
  return { read: (signal?: AbortSignal) => send(undefined, signal), save: (body: Record<string, unknown>) => send(body) };
}
