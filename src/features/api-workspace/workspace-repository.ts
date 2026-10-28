import type { ResourceKey } from "./resources";

export type ApiRecord = Record<string, unknown> & { id: string; rowVersion?: string };
export type ApiPage = { items: ApiRecord[]; page: number; pageSize: number; total: number };
export type WorkspaceResult<T> = { status: "success"; data: T } | { status: "error"; httpStatus: number; code?: string; uncertain: boolean };
async function send<T>(resource: ResourceKey, query: URLSearchParams, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/workspace/${resource}?${query}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json", "X-OMTS-Request": "web" } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json();
    return response.ok && value.status === "success" ? { status: "success", data: value.data as T }
      : { status: "error", httpStatus: response.status, code: value.code, uncertain: response.status >= 500 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}
export function createWorkspaceRepository(resource: ResourceKey) {
  return {
    list(query: Record<string, string>, signal?: AbortSignal) { return send<ApiPage>(resource, new URLSearchParams(query), undefined, signal); },
    detail(id: string, signal?: AbortSignal) { return send<ApiRecord>(resource, new URLSearchParams({ id }), undefined, signal); },
    mutate(action: "create" | "update" | "discontinue" | "reactivate" | "lock" | "unlock", body: Record<string, unknown>, id?: string, zoneId?: string) {
      return send<ApiRecord>(resource, new URLSearchParams(), { action, id, zoneId, body });
    },
  };
}
