import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import type { SelectionPage } from "@/features/operations/selection-pages";
import { toUserAccount, type UserAccount } from "@/features/account-access/user-account-model";
import { loadOptions } from "@/features/operations/lookups";

type Page = SelectionPage<EmployeeListItemDto>;
const PAGE_SIZE = 100, MAX_PAGES = 10;

/** "has" / "none": whether the employee has a login. "unlinked": not an employee filter, the list of logins no employee holds. */
export type AccountFilters = { account: "" | "has" | "none" | "unlinked"; role: string; grantZoneId: string };
export const emptyAccountFilters: AccountFilters = { account: "", role: "", grantZoneId: "" };

/** The server cannot filter by login, role or zone of the login, so these filters make the list read every page and filter here. */
export const filtersNeedAccounts = (filters: AccountFilters) => filters.account === "has" || filters.account === "none" || !!filters.role || !!filters.grantZoneId;
export const hasAccountFilters = (filters: AccountFilters) => !!filters.account || !!filters.role || !!filters.grantZoneId;

/** A login's role matches when one of its Effective pairs has it; "NONE" is a login with no pair. A zone matches its own pair or an all-zones pair. */
export function matchesAccountFilters(row: EmployeeListItemDto, filters: AccountFilters, accounts: ReadonlyMap<string, UserAccount>): boolean {
  if (filters.account === "none") return !row.account;
  if (filters.account === "has" && !row.account) return false;
  if (!filters.role && !filters.grantZoneId) return true;
  const account = row.account ? accounts.get(row.account.id) : undefined;
  if (!account) return false;
  if (filters.role && !(filters.role === "NONE" ? account.pairs.length === 0 : account.pairs.some((pair) => pair.role === filters.role))) return false;
  return !filters.grantZoneId || account.pairs.some((pair) => pair.allZones || pair.zoneId === filters.grantZoneId);
}

const fold = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
/** The typed text over name, code, phone and login name, like the list search does (accents ignored). */
export function matchesTerm(row: EmployeeListItemDto, term: string): boolean {
  const wanted = fold(term.trim().replace(/^@/, ""));
  return !wanted || [row.fullName, row.code, row.phoneNumber ?? "", row.account?.username ?? ""].some((value) => fold(value).includes(wanted));
}

/**
 * Reads the employees page by page (100 at a time, up to MAX_PAGES), keeps those the account filters and the typed text accept, and
 * returns the requested page of that result with an honest total. `readPage` runs the normal query without text or paging.
 */
export async function readWithAccountFilters(
  readPage: (page: number) => Promise<WorkspaceResult<Page>>, filters: AccountFilters, accounts: ReadonlyMap<string, UserAccount>, term: string, page: number, pageSize: number,
): Promise<WorkspaceResult<Page>> {
  const matched: EmployeeListItemDto[] = [];
  for (let index = 1; index <= MAX_PAGES; index++) {
    const result = await readPage(index);
    if (result.status !== "success") return result;
    matched.push(...result.data.items.filter((row) => matchesAccountFilters(row, filters, accounts) && matchesTerm(row, term)));
    if (index * PAGE_SIZE >= result.data.total || !result.data.items.length) break;
  }
  const current = Math.min(page, Math.max(1, Math.ceil(matched.length / pageSize)));
  return { status: "success", data: { items: matched.slice((current - 1) * pageSize, current * pageSize), page: current, pageSize, total: matched.length } };
}

/** The account filters need every login's role and zones, read fresh each time so a change just made is not missed. */
export async function readWithLoadedAccounts(
  readPage: (page: number) => Promise<WorkspaceResult<Page>>, filters: AccountFilters, term: string, page: number, pageSize: number, signal: AbortSignal,
): Promise<WorkspaceResult<Page>> {
  const loaded = await loadOptions("accounts", signal);
  if (loaded.status !== "success") return loaded;
  return readWithAccountFilters(readPage, filters, new Map(loaded.data.map(toUserAccount).map((account) => [account.id, account])), term, page, pageSize);
}
