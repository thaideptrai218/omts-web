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
  /** Optional free note of the Owner; "Chờ đổi mật khẩu" while the temporary password has not been replaced; soft-deleted accounts stay in the list only when asked. */
  note: string | null; mustChangePassword: boolean; deleted: boolean;
  /** "Staff" for a normal account; anything else (the Owner) is protected from lock and delete. */
  subjectType?: string | null;
};

/** Reads the workspace record (backend StaffAccountView) into the shape the screen needs; absent pairs mean "no role yet". */
export function toUserAccount(record: ApiRecord): UserAccount {
  const text = (value: unknown) => typeof value === "string" ? value : null;
  return {
    id: record.id, username: text(record.username) ?? "", displayName: text(record.displayName) ?? "", phoneNumber: text(record.phoneNumber),
    email: text(record.email), status: text(record.status) ?? "", employeeId: text(record.employeeId), rowVersion: record.rowVersion,
    // The reserved Employee role (future Zalo login) is never shown or offered: only the two roles an Owner assigns count here.
    pairs: Array.isArray(record.pairs) ? (record.pairs as UserPair[]).filter((pair) => pair.role === ZONE_MANAGER_ROLE || pair.role === ACCOUNTANT_ROLE) : [],
    subjectType: text(record.subjectType), note: text(record.note), mustChangePassword: record.mustChangePassword === true, deleted: record.deleted === true || record.status === "Deleted",
  };
}

export const roleLabel = (code: string, fallback?: string) => roleDisplayName(code, fallback);
/** One vocabulary for the lock action: the status is "Đang hoạt động" / "Đã khóa"; the actions are "Khóa tài khoản" / "Mở khóa tài khoản". */
export const accountStatusLabel = (status: string) => status === "Active" ? "Đang hoạt động" : status === "Deleted" ? "Đã xóa" : "Đã khóa";
export const pairZoneLabel = (pair: UserPair) => pair.allZones ? "Tất cả vùng" : pair.zoneName || "Vùng chưa có tên";

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
