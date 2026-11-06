import { myPermissionsSchema } from "@/features/auth/api/permissions-contract.schema";
import type { PermissionProjection } from "@/features/access/domain/function-permission";
import { collectFunctionPermissions } from "@/features/access/api/collect-function-permissions";
import { mergeFunctionPermissions } from "@/features/access/api/merge-function-permissions";
import { projectNavigationAccess } from "@/features/access/api/project-navigation-access";

export type PermissionMappingResult =
  | Readonly<{ status: "mapped"; projection: PermissionProjection }>
  | Readonly<{ status: "invalid-permissions" | "account-mismatch" | "gated" }>;

export function mapPermissionsResponse(input: unknown, expectedAccountId: string): PermissionMappingResult {
  const parsed = myPermissionsSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid-permissions" };
  const dto = parsed.data;
  if (dto.accountId.toLowerCase() !== expectedAccountId.toLowerCase()) return { status: "account-mismatch" };

  const invalidOwner = dto.isCooperativeOwner !== (dto.subjectType === "CooperativeOwner");
  const invalidGrants = dto.grants.some((grant) => grant.allZones !== (grant.zoneId === null));
  const duplicateFunctions = new Set(dto.functions.map((entry) => entry.function)).size !== dto.functions.length;
  const invalidFunctions = dto.functions.some((entry) =>
    entry.allZones ? entry.zoneIds.length > 0
      : dto.isCooperativeOwner || (entry.actions.length > 0 && entry.zoneIds.length === 0),
  );
  if (invalidOwner || invalidGrants || duplicateFunctions || invalidFunctions) {
    return { status: "invalid-permissions" };
  }
  if (dto.requiresPasswordChange || dto.requiresPhoneVerification) return { status: "gated" };

  const functionPermissions = mergeFunctionPermissions(collectFunctionPermissions(dto));
  return {
    status: "mapped",
    projection: { functionPermissions, access: projectNavigationAccess(dto, functionPermissions) },
  };
}
