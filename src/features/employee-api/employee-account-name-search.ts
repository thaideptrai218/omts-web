import type { SelectionPage } from "@/features/operations/selection-pages";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";

type Page = SelectionPage<EmployeeListItemDto>;
const ALL_PAGE_SIZE = 100, MAX_PAGES = 5;

/** True when the employee's login name contains the typed text (case-insensitive, with or without a leading "@"). */
export function accountNameMatches(item: EmployeeListItemDto, term: string) {
  const wanted = term.trim().replace(/^@/, "").toLowerCase();
  return !!wanted && !!item.account?.username.toLowerCase().includes(wanted);
}

/**
 * The backend list searches name, code and phone only, so a login name finds nothing there. This runs the normal search and,
 * next to it, reads the same filters without the text (up to MAX_PAGES x 100 employees, i.e. only what the list can load) and
 * adds the employees whose account name matches. Merging happens only when the whole result still fits one page, so paging
 * totals never lie; a broader search keeps the backend's own paging untouched.
 */
export async function searchWithAccountNames(
  term: string, pageSize: number,
  readSearch: () => Promise<WorkspaceResult<Page>>,
  readAll: (page: number) => Promise<WorkspaceResult<Page>>,
): Promise<WorkspaceResult<Page>> {
  if (!term.trim()) return readSearch();
  // The unfiltered read starts first so the backend search stays the last request made.
  const extras = collectAccountMatches(term, readAll);
  const primary = await readSearch();
  const matches = await extras;
  if (primary.status !== "success" || primary.data.page !== 1) return primary;
  const known = new Set(primary.data.items.map(item => item.id));
  const added = matches.filter(item => !known.has(item.id));
  const items = [...primary.data.items, ...added];
  if (!added.length || items.length > pageSize) return primary;
  return { status: "success", data: { ...primary.data, items, total: primary.data.total + added.length } };
}

async function collectAccountMatches(term: string, readAll: (page: number) => Promise<WorkspaceResult<Page>>) {
  const found: EmployeeListItemDto[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await readAll(page);
      if (result.status !== "success") break;
      found.push(...result.data.items.filter(item => accountNameMatches(item, term)));
      if (page * ALL_PAGE_SIZE >= result.data.total || !result.data.items.length) break;
    }
  } catch { /* the plain search result is still valid */ }
  return found;
}
