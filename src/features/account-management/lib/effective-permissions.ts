import type {
  AccessGrant,
  AssignableRole,
  EffectivePermissionZone,
  FarmingZoneOption,
  GrantDraft,
} from "@/features/account-management/domain/account-management";
import type { FeatureCatalogItem } from "@/features/role-management/domain/role-management";

type PreviewInput = Readonly<{
  currentGrants: readonly AccessGrant[];
  featureCatalog: readonly FeatureCatalogItem[];
  newGrants: readonly GrantDraft[];
  roles: readonly AssignableRole[];
  zones: readonly FarmingZoneOption[];
}>;

export function buildEffectivePermissionPreview({
  currentGrants,
  featureCatalog,
  newGrants,
  roles,
  zones,
}: PreviewInput): readonly EffectivePermissionZone[] {
  const effectiveCurrent = currentGrants
    .filter((grant) => grant.status === "effective")
    .map((grant) => ({ roleId: grant.roleId, zoneId: grant.zoneId }));
  const pending = newGrants.map((grant) => ({
    roleId: grant.roleId,
    zoneId: grant.zoneId === "all-zones" ? null : grant.zoneId,
  }));
  const grants = [...effectiveCurrent, ...pending];

  return zones
    .filter((zone) => zone.status === "in-use")
    .map((zone) => {
      const assignedRoles = grants
        .filter((grant) => grant.zoneId === null || grant.zoneId === zone.id)
        .map((grant) => roles.find((role) => role.id === grant.roleId))
        .filter((role): role is AssignableRole => role?.status === "in-use");

      const permissions = featureCatalog
        .map((feature) => {
          const actionKeys = new Set<string>();
          for (const role of assignedRoles) {
            const permission = role.permissions.find(
              (item) => item.featureCode === feature.code,
            );
            permission?.actionKeys.forEach((action) => actionKeys.add(action));
          }
          return {
            actionKeys: feature.supportedActions
              .map((action) => action.key)
              .filter((action) => actionKeys.has(action)),
            featureCode: feature.code,
            featureLabel: feature.label,
          };
        })
        .filter((permission) => permission.actionKeys.length > 0);

      return {
        permissions,
        roleNames: [...new Set(assignedRoles.map((role) => role.name))],
        zoneId: zone.id,
        zoneLabel: zone.label,
      };
    })
    .filter((zone) => zone.roleNames.length > 0);
}
