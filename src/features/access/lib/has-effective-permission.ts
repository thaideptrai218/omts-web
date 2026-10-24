import type {
  EffectiveAccess,
  EffectivePermissionKey,
} from "@/features/access/domain/access-types";

export function hasEffectivePermission(
  access: EffectiveAccess | undefined,
  permissionKey: EffectivePermissionKey,
  zoneId?: string,
): boolean {
  return access?.permissions.some((permission) => {
    if (permission.key !== permissionKey) return false;
    if (permission.scope.kind !== "zones") return true;
    if (permission.scope.zoneIds.length === 0) return false;
    // Without a zone this is menu visibility, not permission to read every zone.
    return zoneId === undefined || permission.scope.zoneIds.includes(zoneId);
  }) ?? false;
}
