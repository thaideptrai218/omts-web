import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { RaftAccess, RaftProfile } from "@/features/rafts/domain/raft";
import { vietnameseBusinessDate } from "@/shared/format/date-only";

export function resolveMockRaftAccess(
  accountId: string,
  accounts: readonly ManagedAccount[],
  roles: readonly AssignableRole[],
  zones: readonly FarmingZoneOption[],
  today = vietnameseBusinessDate(),
): RaftAccess | null {
  const account = accounts.find(
    (item) => item.id === accountId && item.status === "active",
  );
  if (!account) return null;
  if (account.accountType === "cooperative-owner")
    return { accountId, isOwner: true, grants: [] };
  if (account.accountType !== "internal") return null;
  const grants = account.grants.flatMap((grant) => {
    if (
      grant.status !== "effective" ||
      grant.effectiveFrom > today ||
      (grant.effectiveTo && grant.effectiveTo < today) ||
      (grant.zoneId !== null && !zones.some((zone) => zone.id === grant.zoneId))
    )
      return [];
    const permission = roles
      .find((role) => role.id === grant.roleId && role.status === "in-use")
      ?.permissions.find(
        (permission) =>
          permission.featureCode === "RAFT" &&
          permission.actionKeys.includes("VIEW"),
      );
    if (!permission || !["OWN", "ZONE"].includes(permission.dataScopeId ?? ""))
      return [];
    return [
      { zoneId: grant.zoneId, ownOnly: permission.dataScopeId === "OWN" },
    ];
  });
  return grants.length ? { accountId, isOwner: false, grants } : null;
}
export function canReadRaft(access: RaftAccess, raft: RaftProfile): boolean {
  return (
    access.isOwner ||
    access.grants.some(
      (grant) =>
        (grant.zoneId === null || grant.zoneId === raft.zoneId) &&
        (!grant.ownOnly || raft.createdBy === access.accountId),
    )
  );
}
