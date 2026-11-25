import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { roleDisplayName } from "@/features/personal-api/role-display-name";
import type { CreateUserGrant } from "./account-credential-contract";

/** The two fixed roles of the cooperative (BR-FARM-07). Codes come from the backend; the names are the Vietnamese UI copy. */
export { fixedRoleLabels } from "@/features/personal-api/role-display-name";
export const ACCOUNTANT_ROLE = "ACCOUNTANT";
export const ZONE_MANAGER_ROLE = "ZONE_MANAGER";

export type UserPair = { id: string; zoneId: string | null; zoneName: string | null; allZones: boolean; role: string; roleName: string };
export type UserAccount = {
  id: string; username: string; displayName: string; phoneNumber: string | null; email: string | null; status: string;
  employeeId: string | null; pairs: UserPair[]; rowVersion: string | undefined;
};

/** Reads the workspace record (backend StaffAccountView) into the shape the screen needs; absent pairs mean "no role yet". */
export function toUserAccount(record: ApiRecord): UserAccount {
  const text = (value: unknown) => typeof value === "string" ? value : null;
  return {
    id: record.id, username: text(record.username) ?? "", displayName: text(record.displayName) ?? "", phoneNumber: text(record.phoneNumber),
    email: text(record.email), status: text(record.status) ?? "", employeeId: text(record.employeeId), rowVersion: record.rowVersion,
    pairs: Array.isArray(record.pairs) ? (record.pairs as UserPair[]) : [],
  };
}

export const roleLabel = (code: string, fallback?: string) => roleDisplayName(code, fallback);
/** One vocabulary for the lock action: the status is "Đang hoạt động" / "Đã khóa"; the actions are "Khóa tài khoản" / "Mở khóa tài khoản". */
export const accountStatusLabel = (status: string) => status === "Active" ? "Đang hoạt động" : "Đã khóa";
export const pairZoneLabel = (pair: UserPair) => pair.allZones ? "Tất cả vùng" : pair.zoneName || "Vùng chưa có tên";

export type UserFilters = { search: string; role: string; zoneId: string; status: string };
export const emptyUserFilters: UserFilters = { search: "", role: "", zoneId: "", status: "" };
const fold = (value: string) => value.toLocaleLowerCase("vi");

/** Client-side filter over loaded accounts. A role/zone filter matches an Effective pair; "all zones" pairs match any zone. */
export function filterUserAccounts(accounts: readonly UserAccount[], filters: UserFilters, employeeNames: ReadonlyMap<string, string> = new Map()): UserAccount[] {
  const term = fold(filters.search.trim());
  return accounts.filter((account) => {
    if (filters.status && account.status !== filters.status) return false;
    if (filters.role && !(filters.role === "NONE" ? account.pairs.length === 0 : account.pairs.some((pair) => pair.role === filters.role))) return false;
    if (filters.zoneId && !account.pairs.some((pair) => pair.allZones || pair.zoneId === filters.zoneId)) return false;
    if (!term) return true;
    const employee = account.employeeId ? employeeNames.get(account.employeeId) ?? "" : "";
    return [account.displayName, account.username, account.phoneNumber ?? "", account.email ?? "", employee].some((value) => fold(value).includes(term));
  });
}

/** Number of accounts holding each role (one count per account even when it has the role in several zones). */
export function countRoleHolders(accounts: readonly UserAccount[]): Record<string, number> {
  const counts: Record<string, number> = { [ZONE_MANAGER_ROLE]: 0, [ACCOUNTANT_ROLE]: 0 };
  for (const account of accounts) for (const code of new Set(account.pairs.map((pair) => pair.role))) counts[code] = (counts[code] ?? 0) + 1;
  return counts;
}

/**
 * "Sao chép người dùng": the new account takes the Effective pairs of the template. Duplicates collapse, and the Accountant is
 * always whole-cooperative (AC-03) so it is copied as "all zones" whatever the template stored.
 */
export function copyUserGrants(template: Pick<UserAccount, "pairs">): CreateUserGrant[] {
  const seen = new Set<string>(), drafts: CreateUserGrant[] = [];
  for (const pair of template.pairs) {
    if (pair.role !== ZONE_MANAGER_ROLE && pair.role !== ACCOUNTANT_ROLE) continue;
    const zoneId = pair.role === ACCOUNTANT_ROLE || pair.allZones ? null : pair.zoneId;
    const key = `${pair.role}:${zoneId ?? "all"}`;
    if (seen.has(key)) continue;
    seen.add(key); drafts.push({ zoneId, role: pair.role });
  }
  return drafts;
}

/** Zones a Zone Manager grant covers that the linked employee does not list as a working zone (hint of D8). */
export function missingWorkingZones(pairs: readonly UserPair[], workingZoneIds: readonly string[]): UserPair[] {
  return pairs.filter((pair) => pair.role === ZONE_MANAGER_ROLE && !pair.allZones && pair.zoneId && !workingZoneIds.includes(pair.zoneId));
}
