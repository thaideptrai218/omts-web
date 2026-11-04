import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function readDebt<T>(query: Record<string,string>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try { const response = await fetch(`/api/supplier-debts?${new URLSearchParams(Object.entries(query).filter(([,v]) => !!v))}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) }); const value = await response.json(), parsed = schema.safeParse(value.data); return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: false }; } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
