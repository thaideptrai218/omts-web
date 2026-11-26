import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { operationError } from "@/features/operations/ui";
import { createAccountGrant, revokeAccountGrant } from "@/features/personal-api/account-grants-repository";
import type { grantRoleCodes } from "@/features/personal-api/grant-contract";
import type { GrantRow, PlanItem } from "./user-grant-diff";

export type PlanResult = { item: PlanItem; ok: boolean; message?: string };
type Failure = Exclude<WorkspaceResult<unknown>, { status: "success" }>;
type Create = (accountId: string, zoneId: string | null, role: (typeof grantRoleCodes)[number]) => Promise<WorkspaceResult<GrantRow>>;
type Revoke = (accountId: string, grantId: string, reason: string) => Promise<WorkspaceResult<GrantRow>>;

/** Plain Vietnamese for a failed grant call: a duplicate pair reads "đã có quyền ở vùng đó", never the generic "Bản ghi đã tồn tại". */
export function grantFailureMessage(result: Failure): string {
  if (result.httpStatus === 409 && ["MSG03", "MSG-GEN-02"].includes(result.code ?? "")) return "Tài khoản này đã phụ trách vùng đó rồi.";
  if (result.uncertain) return "Chưa biết đã lưu được chưa. Hãy tải lại trang để kiểm tra.";
  return operationError(result);
}

/**
 * Applies the plan through the existing BFF routes: every addition first, then every removal. A failing call never stops the others;
 * each item gets its own result so the Owner sees what worked and what did not. Removals need a reason (the caller checks it is not empty).
 */
export async function applyGrantPlan(accountId: string, plan: readonly PlanItem[], reason: string, create: Create = createAccountGrant, revoke: Revoke = revokeAccountGrant): Promise<PlanResult[]> {
  const results: PlanResult[] = [];
  for (const item of plan) {
    let result: WorkspaceResult<GrantRow>;
    try {
      result = item.kind === "add" ? await create(accountId, item.zoneId, item.role as (typeof grantRoleCodes)[number]) : await revoke(accountId, item.grantId!, reason.trim());
    } catch { result = { status: "error", httpStatus: 0, uncertain: true }; }
    results.push(result.status === "success" ? { item, ok: true } : { item, ok: false, message: grantFailureMessage(result) });
  }
  return results;
}
