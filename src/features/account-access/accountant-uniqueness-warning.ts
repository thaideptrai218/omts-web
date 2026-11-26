import type { ApiRecord, WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { ACCOUNTANT_ROLE, toUserAccount, type UserAccount } from "./user-account-model";

/**
 * Decision D9: a cooperative has one Accountant. Granting the role to a second account is allowed but the Owner is warned
 * first (the dialog's OK continues, never blocks). Returns the warning text, or undefined when there is nothing to warn about.
 * `candidateRoles` are the roles about to be granted; `exceptAccountId` is the account receiving them (it never counts as "another").
 */
export function accountantUniquenessWarning(accounts: readonly UserAccount[], candidateRoles: readonly string[], exceptAccountId?: string): string | undefined {
  if (!candidateRoles.includes(ACCOUNTANT_ROLE)) return undefined;
  const others = accounts.filter((account) => account.id !== exceptAccountId && account.pairs.some((pair) => pair.role === ACCOUNTANT_ROLE));
  if (!others.length) return undefined;
  const names = others.map((account) => account.displayName || account.username).join(", ");
  return `Hợp tác xã đã có Kế toán là ${names}. Thường chỉ cần một Kế toán. Bạn vẫn có thể thêm người thứ hai nếu cần.`;
}

/**
 * The same warning, read from the server's current accounts right before an Accountant is granted. It only warns, never blocks:
 * when the accounts cannot be read there is simply no warning.
 */
export async function accountantWarningFromServer(exceptAccountId?: string, load: (signal: AbortSignal) => Promise<WorkspaceResult<ApiRecord[]>> = (signal) => loadOptions("accounts", signal)): Promise<string | undefined> {
  try {
    const result = await load(AbortSignal.timeout(15_000));
    return result.status === "success" ? accountantUniquenessWarning(result.data.map(toUserAccount), [ACCOUNTANT_ROLE], exceptAccountId) : undefined;
  } catch { return undefined; }
}
