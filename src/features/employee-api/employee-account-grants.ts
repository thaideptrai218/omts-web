import type { ApiRecord, WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { createAccountGrant } from "@/features/personal-api/account-grants-repository";
import { accountantUniquenessWarning } from "@/features/user-management/accountant-uniqueness-warning";
import type { CreateUserGrant } from "@/features/user-management/account-credential-contract";
import { fixedRoleLabels, toUserAccount } from "@/features/user-management/user-account-model";
import { selectionError, selectionToGrants, type GrantSelection } from "@/features/user-management/user-grant-selection";

/**
 * The backend issue-account endpoint (POST /api/employees/{id}/account) and the employee create body accept a username only,
 * so role and zones chosen in the same dialog are sent afterwards, one grant per pair, to the existing grant-create BFF.
 * If one of them fails the account still exists (its password is shown) and the failed pairs are reported by name.
 */
export type GrantApplyOutcome = { granted: number; failed: string[] };
type CreateGrant = (accountId: string, zoneId: string | null, role: CreateUserGrant["role"]) => Promise<WorkspaceResult<unknown>>;

export const hasAnyRole = (selection: GrantSelection) => selection.zoneManager || selection.accountant;
export { selectionError };

/** "Quản lý vùng · Vùng A" / "Kế toán · Tất cả vùng": the pair in the Owner's words. */
export function grantLabel(grant: CreateUserGrant, zoneNames: ReadonlyMap<string, string>): string {
  const role = fixedRoleLabels[grant.role] ?? grant.role;
  return `${role} · ${grant.zoneId ? zoneNames.get(grant.zoneId) ?? "Vùng đã chọn" : "Tất cả vùng"}`;
}

/** Sends every pair even when an earlier one failed, so one bad zone does not hide the others. */
export async function applyGrantSelection(accountId: string, selection: GrantSelection, zoneNames: ReadonlyMap<string, string>, create: CreateGrant = createAccountGrant): Promise<GrantApplyOutcome> {
  const outcome: GrantApplyOutcome = { granted: 0, failed: [] };
  for (const grant of selectionToGrants(selection)) {
    let result: WorkspaceResult<unknown>;
    try { result = await create(accountId, grant.zoneId, grant.role); } catch { result = { status: "error", httpStatus: 0, uncertain: true }; }
    if (result.status === "success") outcome.granted += 1; else outcome.failed.push(grantLabel(grant, zoneNames));
  }
  return outcome;
}

/** Shown next to the one-time password so the Owner knows exactly what to finish in "Quản lý người dùng". */
export function grantOutcomeNotice(outcome: GrantApplyOutcome | undefined): string | undefined {
  if (!outcome) return undefined;
  if (outcome.failed.length) return `Tài khoản đã được tạo nhưng chưa gán được: ${outcome.failed.join("; ")}. Hãy thêm các quyền này tại Quản lý người dùng.`;
  return outcome.granted ? "Đã phân quyền. Nhân viên cần đăng nhập lại để thấy quyền và vùng mới." : undefined;
}

/** Warn, never block (D9): the loader reads all accounts; when it fails there is simply no warning. */
export async function accountantWarningFor(selection: GrantSelection, load: (signal: AbortSignal) => Promise<WorkspaceResult<ApiRecord[]>> = signal => loadOptions("accounts", signal)): Promise<string | undefined> {
  if (!selection.accountant) return undefined;
  try {
    const result = await load(AbortSignal.timeout(15_000));
    return result.status === "success" ? accountantUniquenessWarning(result.data.map(toUserAccount), ["ACCOUNTANT"]) : undefined;
  } catch { return undefined; }
}
