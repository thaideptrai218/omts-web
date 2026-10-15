import type {
  EffectiveAccess,
  EffectivePermissionKey,
} from "@/features/access/domain/access-types";

export function hasEffectivePermission(
  access: EffectiveAccess | undefined,
  permissionKey: EffectivePermissionKey,
  zoneId?: string,
): boolean {
  const permission = access?.permissions.find(({ key }) => key === permissionKey);

  if (!permission) return false;
  if (!zoneId || permission.scope.kind === "all-zones") return true;

  return permission.scope.zoneIds.includes(zoneId);
}
