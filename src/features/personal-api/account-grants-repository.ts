import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { grantHistorySchema, grantRowSchema, permissionCatalogSchema, roleImpactSchema } from "./grant-contract";
async function read<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(path, { cache: "no-store", credentials: "same-origin", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json();
    if (response.status === 200 && value.status === "success") { const parsed = schema.safeParse(value.data); if (parsed.success) return { status: "success", data: parsed.data }; }
    return { status: "error", httpStatus: response.status, code: typeof value.code === "string" ? value.code : undefined, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
export const readAccountGrants = (id: string, signal?: AbortSignal) => read(`/api/account-grants?accountId=${encodeURIComponent(id)}`, grantHistorySchema, signal);
export const readPermissionFunctions = (signal?: AbortSignal) => read("/api/permission-functions", permissionCatalogSchema, signal);
export const readRoleImpact = (id: string, signal?: AbortSignal) => read(`/api/role-impact?roleId=${encodeURIComponent(id)}`, roleImpactSchema, signal);
export async function revokeAccountGrant(accountId: string, grantId: string, reason: string): Promise<WorkspaceResult<z.infer<typeof grantRowSchema>>> {
  try {
    const response = await fetch("/api/account-grants/revoke", { method: "POST", credentials: "same-origin", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000), headers: { "Content-Type": "application/json", "X-OMTS-Request": "web", Accept: "application/json" }, body: JSON.stringify({ accountId, grantId, reason, confirmed: true }) });
    const value = await response.json();
    if (response.status === 200 && value.status === "success") { const parsed = grantRowSchema.safeParse(value.data); if (parsed.success && parsed.data.id === grantId && parsed.data.state === "Revoked") return { status: "success", data: parsed.data }; }
    return { status: "error", httpStatus: response.status, code: typeof value.code === "string" ? value.code : undefined, uncertain: response.status >= 500 || response.ok || response.status === 401 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}
