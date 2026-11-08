import type { MyPermissionsDto } from "@/features/auth/api/permissions-contract.schema";

export const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007";
export const zoneA = "122bb318-a72e-49aa-a8d7-a6169f889001";
export const zoneB = "122bb318-a72e-49aa-a8d7-a6169f889002";
type Grant = MyPermissionsDto["grants"][number];
type Permission = Grant["permissions"][number];
type Summary = MyPermissionsDto["functions"][number];

export function permission(overrides: Partial<Permission> = {}): Permission {
  return {
    functionCode: "WATER_MEASUREMENTS", canView: true, canCreate: false,
    canEdit: false, canDelete: false, otherPermissions: [], dataScope: "AssignedZone",
    ...overrides,
  };
}

export function grant(overrides: Partial<Grant> = {}): Grant {
  return {
    zoneId: zoneA, zoneCode: "ZONE-QA", zoneName: "Vùng kiểm thử", allZones: false,
    role: "Vai trò tuỳ chỉnh", permissions: [permission()], ...overrides,
  };
}

export function summary(overrides: Partial<Summary> = {}): Summary {
  return {
    function: "WATER_MEASUREMENTS", name: "Đo nước", allZones: false,
    zoneIds: [zoneA], actions: ["View"], ...overrides,
  };
}

export function staffPayload(overrides: Partial<MyPermissionsDto> = {}): MyPermissionsDto {
  return {
    accountId, subjectType: "Staff", isCooperativeOwner: false,
    requiresPasswordChange: false, requiresPhoneVerification: false,
    functions: [summary()], grants: [grant()], ...overrides,
  };
}
