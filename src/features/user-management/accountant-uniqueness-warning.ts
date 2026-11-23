import { ACCOUNTANT_ROLE, type UserAccount } from "./user-account-model";

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
  return `Hợp tác xã đã có Kế toán: ${names}. Thông thường chỉ có một Kế toán cho toàn hợp tác xã. Bạn vẫn có thể tiếp tục nếu cần thêm Kế toán thứ hai.`;
}
