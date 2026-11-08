import "server-only";

import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import {
  backendFunctionCatalog,
  isBackendFunctionCode,
  type BackendFunctionCode,
} from "@/features/access/domain/backend-function-catalog";
import type {
  FunctionAction,
  PermissionProjection,
} from "@/features/access/domain/function-permission";
import { z } from "zod";

const requirementSchema = z.strictObject({
  functionCode: z.string().refine(isBackendFunctionCode),
  action: z.string(),
  scope: z.union([
    z.strictObject({ kind: z.literal("any-assigned-zone") }),
    z.strictObject({ kind: z.literal("all-zones") }),
    z.strictObject({ kind: z.literal("zone"), zoneId: apiIdSchema }),
  ]),
});

export type FunctionCapabilityRequirement = Readonly<{
  functionCode: BackendFunctionCode;
  action: FunctionAction;
  scope:
    | Readonly<{ kind: "any-assigned-zone" }>
    | Readonly<{ kind: "zone"; zoneId: string }>
    | Readonly<{ kind: "all-zones" }>;
}>;

export type FunctionCapabilityResult =
  | Readonly<{
      status: "granted";
      dataScopes: readonly ("OwnRecords" | "AssignedZone")[];
    }>
  | Readonly<{ status: "denied" | "invalid-requirement" }>;

function normalizeRequirement(
  input: unknown,
): FunctionCapabilityRequirement | undefined {
  let value: z.infer<typeof requirementSchema>;
  try {
    const parsed = requirementSchema.safeParse(input);
    if (!parsed.success) return undefined;
    value = parsed.data;
  } catch { return undefined; }
  if (!isBackendFunctionCode(value.functionCode)) return undefined;
  const actions: readonly string[] = backendFunctionCatalog[value.functionCode].actions;
  if (!actions.includes(value.action)) return undefined;
  const scope = value.scope;
  if (scope.kind === "any-assigned-zone" || scope.kind === "all-zones") {
    return {
      functionCode: value.functionCode,
      action: value.action as FunctionAction,
      scope: { kind: scope.kind },
    };
  }
  if (scope.kind !== "zone") return undefined;
  return {
    functionCode: value.functionCode,
    action: value.action as FunctionAction,
    scope: { kind: "zone", zoneId: scope.zoneId.toLowerCase() },
  };
}

function scopeMatches(
  permission: PermissionProjection["functionPermissions"][number],
  requirement: FunctionCapabilityRequirement,
): boolean {
  if (permission.scope.kind === "zones" && permission.scope.zoneIds.length === 0) return false;
  if (requirement.scope.kind === "any-assigned-zone") return true;
  if (requirement.scope.kind === "all-zones") {
    return permission.scope.kind === "all-zones";
  }
  return permission.scope.kind === "all-zones"
    || permission.scope.zoneIds.includes(requirement.scope.zoneId);
}

/**
 * Server authorization helper. A grant still carries its data scope so the
 * feature DAL cannot mistake OwnRecords for all records in an assigned zone.
 */
export function guardFunctionCapability(
  projection: PermissionProjection,
  input: unknown,
): FunctionCapabilityResult {
  const requirement = normalizeRequirement(input);
  if (requirement === undefined) {
    return Object.freeze({ status: "invalid-requirement" });
  }

  const dataScopes = projection.functionPermissions
    .filter((permission) =>
      permission.functionCode === requirement.functionCode
      && permission.action === requirement.action
      && scopeMatches(permission, requirement),
    )
    .map((permission) => permission.dataScope);
  const unique = [...new Set(dataScopes)];
  if (unique.length === 0) return Object.freeze({ status: "denied" });

  return Object.freeze({
    status: "granted",
    dataScopes: Object.freeze(unique),
  });
}
