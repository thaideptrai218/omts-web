import { describe, expect, it } from "vitest";
import { myPermissionsSchema } from "@/features/auth/api/permissions-contract.schema";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const permission = {
  functionCode: "WATER_MEASUREMENTS", canView: true, canCreate: false,
  canEdit: false, canDelete: false, otherPermissions: [], dataScope: "AssignedZone",
};
const grant = {
  zoneId: id, zoneCode: "ZONE-QA", zoneName: "Vùng kiểm thử", allZones: false,
  role: "Vai trò kiểm thử", permissions: [permission],
};
const functionAccess = {
  function: "WATER_MEASUREMENTS", name: "Đo nước", allZones: false,
  zoneIds: [id], actions: ["View"],
};
const permissions = {
  accountId: id, subjectType: "Staff", isCooperativeOwner: false,
  requiresPasswordChange: false, requiresPhoneVerification: false,
  functions: [functionAccess], grants: [grant],
};

describe("permissions wire schema (not a permission mapper)", () => {
  it("preserves action and per-grant scope for subsequent mapping", () => {
    expect(myPermissionsSchema.parse(permissions)).toEqual(permissions);
  });

  it("accepts a cooperative-wide grant and empty permission lists", () => {
    const input = {
      ...permissions, functions: [],
      grants: [{ ...grant, allZones: true, zoneId: null, zoneName: null, zoneCode: null }],
    };
    expect(myPermissionsSchema.parse(input)).toEqual(input);
    expect(myPermissionsSchema.safeParse({ ...permissions, functions: [], grants: [] }).success).toBe(true);
  });

  it.each([
    { ...functionAccess, actions: ["FutureAction"] },
    { ...functionAccess, allZones: "false" },
    { ...functionAccess, zoneIds: ["not-a-guid"] },
  ])("rejects malformed or unknown function action semantics", (entry) => {
    expect(myPermissionsSchema.safeParse({ ...permissions, functions: [entry] }).success).toBe(false);
  });

  it.each([
    { ...permission, dataScope: "Everywhere" },
    { ...permission, otherPermissions: ["UnknownAction"] },
    { ...permission, canEdit: undefined },
  ])("rejects malformed grant permission semantics", (entry) => {
    const input = { ...permissions, grants: [{ ...grant, permissions: [entry] }] };
    expect(myPermissionsSchema.safeParse(input).success).toBe(false);
  });

  it("does not grant a default capability for an additive function code", () => {
    const input = { ...permissions, functions: [{ ...functionAccess, function: "FUTURE_FUNCTION" }] };
    expect(myPermissionsSchema.parse(input).functions[0]?.function).toBe("FUTURE_FUNCTION");
    // No conversion to EffectiveAccess is performed by this module.
  });

  it("requires gate flags and strips additive nested fields", () => {
    expect(myPermissionsSchema.safeParse({ ...permissions, requiresPhoneVerification: undefined }).success).toBe(false);
    const parsed = myPermissionsSchema.parse({
      ...permissions, functions: [{ ...functionAccess, futureFlag: true }],
    });
    expect(parsed.functions[0]).toEqual(functionAccess);
  });
});
