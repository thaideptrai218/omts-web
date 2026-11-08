import type { EffectiveAccess, EffectivePermission } from "@/features/access/domain/access-types";
import { backendFunctionCatalog, isBackendFunctionCode } from "@/features/access/domain/backend-function-catalog";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import type { MyPermissionsDto } from "@/features/auth/api/permissions-contract.schema";

const ownerOnlyKeys = [
  "access.accounts.manage", "access.roles.manage",
  "cooperative.employees.manage", "cooperative.profile.manage",
] as const;

export function projectNavigationAccess(
  dto: MyPermissionsDto,
  functions: readonly FunctionPermission[],
): EffectiveAccess {
  // These four endpoints have RequireCooperativeOwner; no Staff function maps to them.
  const permissions: EffectivePermission[] = dto.isCooperativeOwner
    ? ownerOnlyKeys.map((key) => ({ key, scope: { kind: "all-zones" } }))
    : [];

  const tiles = functions.filter((entry) => entry.action === "View"
    && isBackendFunctionCode(entry.functionCode)
    && backendFunctionCatalog[entry.functionCode].dashboardTile);
  if (tiles.length) {
    const allZones = tiles.some((entry) => entry.scope.kind === "all-zones");
    const zoneIds = tiles.flatMap((entry) => entry.scope.kind === "zones" ? entry.scope.zoneIds : []);
    permissions.push({
      key: "workspace.overview.view",
      scope: allZones ? { kind: "all-zones" } : { kind: "zones", zoneIds: [...new Set(zoneIds)] },
    });
  }
  // Page visibility only: tile data still needs its function/action/dataScope checks.
  // No confirmed function binding exists here for platform.cooperative.provision.
  return { permissions };
}
