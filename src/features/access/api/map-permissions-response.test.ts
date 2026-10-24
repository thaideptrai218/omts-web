import { describe, expect, it } from "vitest";
import { mapPermissionsResponse } from "@/features/access/api/map-permissions-response";
import { accountId, grant, permission, staffPayload, summary, zoneA } from "@/features/access/api/__fixtures__/permissions";

describe("permission mapping identity, gates and capability bindings", () => {
  it("rejects another account while accepting equivalent GUID casing", () => {
    expect(mapPermissionsResponse(staffPayload(), accountId.toUpperCase()).status).toBe("mapped");
    expect(mapPermissionsResponse(staffPayload(), zoneA)).toEqual({ status: "account-mismatch" });
  });

  it.each(["requiresPasswordChange", "requiresPhoneVerification"] as const)(
    "does not project application permissions when %s applies", (gate) => {
      expect(mapPermissionsResponse(staffPayload({ [gate]: true }), accountId)).toEqual({ status: "gated" });
    },
  );

  it.each([
    staffPayload({ isCooperativeOwner: true }),
    staffPayload({ subjectType: "CooperativeOwner" }),
    staffPayload({ grants: [grant({ allZones: true })] }),
    staffPayload({ grants: [grant({ zoneId: null })] }),
    staffPayload({ functions: [summary({ allZones: true })] }),
    staffPayload({ functions: [summary({ zoneIds: [] })] }),
    staffPayload({ functions: [summary(), summary()] }),
  ])("rejects contradictory flags/scopes without a partial projection", (input) => {
    expect(mapPermissionsResponse(input, accountId)).toEqual({ status: "invalid-permissions" });
  });

  it("maps the four Owner-only endpoints without relying on role names or grants", () => {
    const result = mapPermissionsResponse(staffPayload({
      subjectType: "CooperativeOwner", isCooperativeOwner: true, grants: [],
      functions: [summary({ function: "DASHBOARD_WATER_ALERTS", allZones: true, zoneIds: [] })],
    }), accountId);
    expect(result).toMatchObject({ status: "mapped", projection: { access: { permissions: [
      { key: "access.accounts.manage", scope: { kind: "all-zones" } },
      { key: "access.roles.manage", scope: { kind: "all-zones" } },
      { key: "cooperative.employees.manage", scope: { kind: "all-zones" } },
      { key: "cooperative.profile.manage", scope: { kind: "all-zones" } },
      { key: "workspace.overview.view", scope: { kind: "all-zones" } },
    ] } } });
  });

  it.each(["requiresPasswordChange", "requiresPhoneVerification"] as const)(
    "does not let the Owner shortcut bypass gate %s", (gate) => {
      const input = staffPayload({
        subjectType: "CooperativeOwner", isCooperativeOwner: true,
        functions: [], grants: [], [gate]: true,
      });
      expect(mapPermissionsResponse(input, accountId)).toEqual({ status: "gated" });
    },
  );

  it("maps dashboard View only to page visibility and keeps per-tile constraints", () => {
    const code = "DASHBOARD_WATER_ALERTS";
    const result = mapPermissionsResponse(staffPayload({
      functions: [summary({ function: code })],
      grants: [grant({ role: "Kế toán", permissions: [permission({ functionCode: code, dataScope: "OwnRecords" })] })],
    }), accountId);
    expect(result).toMatchObject({ status: "mapped", projection: {
      access: { permissions: [{ key: "workspace.overview.view", scope: { kind: "zones", zoneIds: [zoneA] } }] },
      functionPermissions: [{ functionCode: code, action: "View", dataScope: "OwnRecords" }],
    } });
  });

  it("does not infer Owner capabilities from a Staff role label", () => {
    const result = mapPermissionsResponse(staffPayload({ grants: [grant({ role: "Chủ hợp tác xã" })] }), accountId);
    expect(result).toMatchObject({ status: "mapped", projection: { access: { permissions: [] } } });
  });

  it.each(["Trader", "SystemAdministrator"] as const)(
    "does not infer business rights or an unconfirmed platform binding for %s", (subjectType) => {
      const result = mapPermissionsResponse(staffPayload({ subjectType }), accountId);
      expect(result).toEqual({ status: "mapped", projection: {
        access: { permissions: [] }, functionPermissions: [],
      } });
    },
  );

  it("does not mutate the input or expose role/extra fields on the projection", () => {
    const input = { ...staffPayload(), extra: "private" };
    const before = structuredClone(input);
    const result = mapPermissionsResponse(input, accountId);
    expect(result.status).toBe("mapped");
    expect(input).toEqual(before);
    if (result.status === "mapped") expect(result.projection).not.toHaveProperty("extra");
  });
});
