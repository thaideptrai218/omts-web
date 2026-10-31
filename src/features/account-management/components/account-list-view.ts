import type {
  AssignableRole,
  FarmingZoneOption,
  ManagedAccount,
} from "@/features/account-management/domain/account-management";

export type AccountAssignmentSummary = Readonly<{
  grantId: string;
  roleId: string;
  roleName: string;
  zoneId: string | null;
  zoneLabel: string;
}>;

export type AccountListFilters = Readonly<{
  query: string;
  roleId: string;
  zoneId: string;
}>;

export function getEffectiveAssignments(
  account: ManagedAccount,
  roles: readonly AssignableRole[],
  zones: readonly FarmingZoneOption[],
): readonly AccountAssignmentSummary[] {
  const roleNames = new Map(roles.map((role) => [role.id, role.name]));
  const zoneNames = new Map(zones.map((zone) => [zone.id, zone.label]));

  return account.grants
    .filter((grant) => grant.status === "effective")
    .map((grant) => ({
      grantId: grant.id,
      roleId: grant.roleId,
      roleName: roleNames.get(grant.roleId) ?? "Vai trò không còn trong danh mục",
      zoneId: grant.zoneId,
      zoneLabel:
        grant.zoneId === null
          ? "Tất cả vùng"
          : zoneNames.get(grant.zoneId) ?? "Vùng không còn trong danh mục",
    }));
}

export function matchesAccountListFilters(
  account: ManagedAccount,
  assignments: readonly AccountAssignmentSummary[],
  filters: AccountListFilters,
): boolean {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("vi");
  const searchableValues = [
    account.displayName,
    account.username,
    account.phone,
    ...assignments.flatMap((assignment) => [
      assignment.roleName,
      assignment.zoneLabel,
    ]),
  ];
  const matchesQuery = searchableValues.some((value) =>
    value.toLocaleLowerCase("vi").includes(normalizedQuery),
  );
  const matchesRole =
    filters.roleId === "all" ||
    assignments.some((assignment) => assignment.roleId === filters.roleId);
  const matchesZone =
    filters.zoneId === "all" ||
    assignments.some((assignment) => {
      if (filters.zoneId === "all-zones") return assignment.zoneId === null;
      return assignment.zoneId === null || assignment.zoneId === filters.zoneId;
    });

  return matchesQuery && matchesRole && matchesZone;
}
