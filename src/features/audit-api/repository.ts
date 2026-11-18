import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { auditDetail, auditFacets, auditPage } from "./contracts";

export type AuditQuery = Record<string, string>;

/** The audit log is read only, so every request is a GET and none is ever "uncertain". */
async function read<T>(values: AuditQuery, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ""));
    const response = await bffFetch(`/api/audit-events?${query}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}

export const auditRepository = {
  list: (values: AuditQuery, signal?: AbortSignal) => read(values, auditPage, signal),
  detail: (id: string, signal?: AbortSignal) => read({ id }, auditDetail, signal),
  facets: (signal?: AbortSignal) => read({ facets: "1" }, auditFacets, signal),
};
