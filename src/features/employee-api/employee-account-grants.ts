import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createAccountGrant } from "@/features/personal-api/account-grants-repository";
import { accountantWarningFromServer } from "@/features/account-access/accountant-uniqueness-warning";
import type { CreateUserGrant } from "@/features/account-access/account-credential-contract";
import { fixedRoleLabels } from "@/features/account-access/user-account-model";
import { selectionError, selectionToGrants, type GrantSelection } from "@/features/account-access/user-grant-selection";

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

/** Shown next to the one-time password so the Owner knows exactly what is still left to do. */
export function grantOutcomeNotice(outcome: GrantApplyOutcome | undefined): string | undefined {
  if (!outcome) return undefined;
  if (outcome.failed.length) return `Đã tạo tài khoản nhưng chưa thêm được: ${outcome.failed.join("; ")}. Hãy chọn lại ở tab Tài khoản đăng nhập của nhân viên.`;
  return outcome.granted ? "Đã chọn vai trò và vùng. Nhân viên cần đăng nhập lại mới thấy thay đổi." : undefined;
}

/** Warn, never block (D9): the loader reads all accounts; when it fails there is simply no warning. */
export const accountantWarningFor = (selection: GrantSelection, load?: Parameters<typeof accountantWarningFromServer>[1]): Promise<string | undefined> =>
  selection.accountant ? accountantWarningFromServer(undefined, load) : Promise.resolve(undefined);
