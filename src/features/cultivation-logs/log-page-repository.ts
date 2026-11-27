import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { logPageSchema, type LogPage, type LogPageQuery } from "./log-page-contract";

/** One server-paged read of the care logs (`GET /api/cultivation-logs`) through the BFF; blank filters are left out. */
export async function readLogPage(query: LogPageQuery, signal: AbortSignal): Promise<WorkspaceResult<LogPage>> {
  const params = new URLSearchParams({ action: "page" });
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  try {
    const response = await bffFetch(`/api/cultivation-logs?${params}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal, headers: { Accept: "application/json" } });
    const value = await response.json(), parsed = response.ok && value.status === "success" ? logPageSchema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
