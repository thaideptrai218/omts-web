import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import type { SelectionPage } from "@/features/operations/selection-pages";

type Page = SelectionPage<EmployeeListItemDto>;
const PAGE_SIZE = 100, MAX_PAGES = 10;

/** "has" / "none": whether the employee has a login account. Role, zones and the account itself are managed on the Tài khoản người dùng screen. */
export type AccountFilter = "" | "has" | "none";

/** The server cannot filter by account, so choosing one makes the list read every page and filter here (each row already carries its account). */
export const filterNeedsAccounts = (filter: AccountFilter) => filter === "has" || filter === "none";

export function matchesAccountFilter(row: EmployeeListItemDto, filter: AccountFilter): boolean {
  return filter === "none" ? !row.account : filter === "has" ? !!row.account : true;
}

const fold = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");
/** The typed text over name, code, phone and login name, like the list search does (accents ignored). */
export function matchesTerm(row: EmployeeListItemDto, term: string): boolean {
  const wanted = fold(term.trim().replace(/^@/, ""));
  return !wanted || [row.fullName, row.code, row.phoneNumber ?? "", row.account?.username ?? ""].some((value) => fold(value).includes(wanted));
}

/**
 * Reads the employees page by page (100 at a time, up to MAX_PAGES), keeps those the account filter and the typed text accept, and
 * returns the requested page of that result with an honest total. `readPage` runs the normal query without text or paging.
 */
export async function readWithAccountFilter(
  readPage: (page: number) => Promise<WorkspaceResult<Page>>, filter: AccountFilter, term: string, page: number, pageSize: number,
): Promise<WorkspaceResult<Page>> {
  const matched: EmployeeListItemDto[] = [];
  for (let index = 1; index <= MAX_PAGES; index++) {
    const result = await readPage(index);
    if (result.status !== "success") return result;
    matched.push(...result.data.items.filter((row) => matchesAccountFilter(row, filter) && matchesTerm(row, term)));
    if (index * PAGE_SIZE >= result.data.total || !result.data.items.length) break;
  }
  const current = Math.min(page, Math.max(1, Math.ceil(matched.length / pageSize)));
  return { status: "success", data: { items: matched.slice((current - 1) * pageSize, current * pageSize), page: current, pageSize, total: matched.length } };
}
