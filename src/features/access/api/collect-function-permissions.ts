import {
  backendFunctionCatalog,
  isBackendFunctionCode,
} from "@/features/access/domain/backend-function-catalog";
import type { FunctionPermission, FunctionAction } from "@/features/access/domain/function-permission";
import type { MyPermissionsDto } from "@/features/auth/api/permissions-contract.schema";

type GrantedPermission = MyPermissionsDto["grants"][number]["permissions"][number];
type Grant = MyPermissionsDto["grants"][number];
type FunctionSummary = MyPermissionsDto["functions"][number];

function intersectScope(grant: Grant, summary: FunctionSummary): FunctionPermission["scope"] | undefined {
  if (grant.zoneId === null) return summary.allZones
    ? { kind: "all-zones" }
    : { kind: "zones", zoneIds: summary.zoneIds.map((id) => id.toLowerCase()) };
  const zoneId = grant.zoneId.toLowerCase();
  return summary.allZones || summary.zoneIds.some((id) => id.toLowerCase() === zoneId)
    ? { kind: "zones", zoneIds: [zoneId] }
    : undefined;
}

function allows(permission: GrantedPermission, action: FunctionAction): boolean {
  switch (action) {
    case "View": return permission.canView;
    case "Create": return permission.canCreate;
    case "Edit": return permission.canEdit;
    case "Delete": return permission.canDelete;
    default: return permission.otherPermissions.includes(action);
  }
}

export function collectFunctionPermissions(dto: MyPermissionsDto): readonly FunctionPermission[] {
  const summary = new Map(dto.functions.map((entry) => [entry.function, entry]));
  const results: FunctionPermission[] = [];
  if (dto.subjectType === "CooperativeOwner") {
    for (const entry of dto.functions) {
      if (!isBackendFunctionCode(entry.function)) continue;
      const definition = backendFunctionCatalog[entry.function];
      for (const action of definition.actions) {
        if (entry.actions.includes(action)) results.push({
          functionCode: entry.function, action, scope: { kind: "all-zones" }, dataScope: "AssignedZone",
        });
      }
    }
    return results;
  }
  if (dto.subjectType !== "Staff") return results;

  for (const grant of dto.grants) {
    for (const permission of grant.permissions) {
      if (!isBackendFunctionCode(permission.functionCode)) continue;
      const definition = backendFunctionCatalog[permission.functionCode];
      const functionSummary = summary.get(permission.functionCode);
      if (!functionSummary) continue;
      if (definition.cooperativeWide && (!grant.allZones || !functionSummary.allZones)) continue;
      const scope = intersectScope(grant, functionSummary);
      if (!scope) continue;
      for (const action of definition.actions) {
        if (!allows(permission, action) || !functionSummary.actions.includes(action)) continue;
        results.push({
          functionCode: permission.functionCode, action, dataScope: permission.dataScope,
          scope,
        });
      }
    }
  }
  return results;
}
