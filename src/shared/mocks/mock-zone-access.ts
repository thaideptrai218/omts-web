import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";
import type { ZoneAccess } from "@/features/farming-zones/domain/farming-zone";
import { vietnameseBusinessDate } from "@/shared/format/date-only";

export function resolveMockZoneAccess(
  accountId: string,
  accounts: readonly ManagedAccount[],
  roles: readonly AssignableRole[],
  zones: readonly FarmingZoneOption[],
  today = vietnameseBusinessDate(),
): ZoneAccess | null {
  const account = accounts.find(
    (item) => item.id === accountId && item.status === "active",
  );
  if (!account) return null;
  if (account.accountType === "cooperative-owner")
    return {
      canWrite: true,
      visibleZoneIds: null,
      actorName: account.displayName,
    };
  if (account.accountType !== "internal") return null;
  const grants = account.grants.filter(
    (grant) =>
      grant.status === "effective" &&
      grant.effectiveFrom <= today &&
      (!grant.effectiveTo || grant.effectiveTo >= today) &&
      roles.some(
        (role) =>
          role.id === grant.roleId &&
          role.status === "in-use" &&
          role.permissions.some(
            (permission) =>
              permission.featureCode === "FARMING_ZONE" &&
              permission.actionKeys.includes("VIEW"),
          ),
      ) &&
      (grant.zoneId === null || zones.some((zone) => zone.id === grant.zoneId)),
  );
  if (!grants.length) return null;
  return {
    canWrite: false,
    actorName: account.displayName,
    visibleZoneIds: grants.some((grant) => grant.zoneId === null)
      ? null
      : [
          ...new Set(
            grants.flatMap((grant) => (grant.zoneId ? [grant.zoneId] : [])),
          ),
        ],
  };
}
