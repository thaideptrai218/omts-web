import type { UserAccount } from "./user-account-model";

/** What the account list shows as the state: a pending (temporary) password only matters while the account is active. */
export type AccountState = "active" | "pending" | "locked" | "deleted";
export const accountState = (account: Pick<UserAccount, "status" | "mustChangePassword" | "deleted">): AccountState =>
  account.deleted || account.status === "Deleted" ? "deleted" : account.status !== "Active" ? "locked" : account.mustChangePassword ? "pending" : "active";
export const accountStateLabel: Record<AccountState, string> = { active: "Đang hoạt động", pending: "Chờ đổi mật khẩu", locked: "Đã khóa", deleted: "Đã xóa" };

export type UserFilters = { search: string; role: string; zoneId: string; state: "" | AccountState; employee: "" | "yes" | "no" };
export const emptyUserFilters: UserFilters = { search: "", role: "", zoneId: "", state: "", employee: "" };
export const hasUserFilters = (filters: UserFilters) => Object.values(filters).some(Boolean);

/** Accents and case are ignored, so "ngoc vung" finds "Ngọc Vừng". */
export const foldText = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");

/**
 * Client-side filter over every loaded account (a cooperative has a handful). A role/zone filter matches an Effective pair, an
 * "all zones" pair matches any zone; search covers login name, display name, phone, email and the linked employee's name.
 */
export function filterUserAccounts(accounts: readonly UserAccount[], filters: UserFilters, employeeNames: ReadonlyMap<string, string> = new Map()): UserAccount[] {
  const term = foldText(filters.search.trim().replace(/^@/, ""));
  return accounts.filter((account) => {
    if (filters.state && accountState(account) !== filters.state) return false;
    if (filters.employee && !!account.employeeId !== (filters.employee === "yes")) return false;
    if (filters.role && !(filters.role === "NONE" ? account.pairs.length === 0 : account.pairs.some((pair) => pair.role === filters.role))) return false;
    if (filters.zoneId && !account.pairs.some((pair) => pair.allZones || pair.zoneId === filters.zoneId)) return false;
    if (!term) return true;
    const employee = account.employeeId ? employeeNames.get(account.employeeId) ?? "" : "";
    return [account.displayName, account.username, account.phoneNumber ?? "", account.email ?? "", employee].some((value) => foldText(value).includes(term));
  });
}

export type AccountSort = { key: string; direction: "asc" | "desc" };
const sortValue = (account: UserAccount, key: string): string => key === "username" ? account.username : key === "phone" ? account.phoneNumber ?? ""
  : key === "email" ? account.email ?? "" : key === "state" ? accountStateLabel[accountState(account)] : key === "note" ? account.note ?? "" : account.displayName;

/** Sorts a copy by one column (Vietnamese collation, empty values last); no key keeps the order the server sent. */
export function sortUserAccounts(accounts: readonly UserAccount[], sort: AccountSort | undefined): UserAccount[] {
  if (!sort?.key) return [...accounts];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...accounts].sort((a, b) => {
    const left = sortValue(a, sort.key), right = sortValue(b, sort.key);
    if (!left !== !right) return left ? -1 : 1;
    return sign * left.localeCompare(right, "vi") || a.id.localeCompare(b.id);
  });
}
