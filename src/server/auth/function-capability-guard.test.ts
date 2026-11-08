import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PermissionProjection } from "@/features/access/domain/function-permission";
import { guardFunctionCapability } from "./function-capability-guard";

const zoneA = "122bb318-a72e-49aa-a8d7-a6169f889001";
const zoneB = "122bb318-a72e-49aa-a8d7-a6169f889002";

function projection(): PermissionProjection {
  return {
    access: { permissions: [] },
    functionPermissions: [
      {
        functionCode: "WATER_MEASUREMENTS",
        action: "View",
        scope: { kind: "zones", zoneIds: [zoneA] },
        dataScope: "OwnRecords",
      },
      {
        functionCode: "WATER_MEASUREMENTS",
        action: "View",
        scope: { kind: "zones", zoneIds: [zoneA, zoneB] },
        dataScope: "AssignedZone",
      },
      {
        functionCode: "PAYROLL",
        action: "View",
        scope: { kind: "all-zones" },
        dataScope: "AssignedZone",
      },
    ],
  };
}

describe("function capability guard", () => {
  it("grants a concrete assigned zone and preserves both data scopes", () => {
    expect(guardFunctionCapability(projection(), {
      functionCode: "WATER_MEASUREMENTS",
      action: "View",
      scope: { kind: "zone", zoneId: zoneA.toUpperCase() },
    })).toEqual({
      status: "granted",
      dataScopes: ["OwnRecords", "AssignedZone"],
    });
  });

  it("does not treat a permission in one zone as permission in another", () => {
    expect(guardFunctionCapability(projection(), {
      functionCode: "WATER_MEASUREMENTS",
      action: "View",
      scope: {
        kind: "zone",
        zoneId: "122bb318-a72e-49aa-a8d7-a6169f889003",
      },
    })).toEqual({ status: "denied" });
  });

  it("allows page discovery for any assigned zone without claiming all-zones access", () => {
    expect(guardFunctionCapability(projection(), {
      functionCode: "WATER_MEASUREMENTS",
      action: "View",
      scope: { kind: "any-assigned-zone" },
    })).toEqual({
      status: "granted",
      dataScopes: ["OwnRecords", "AssignedZone"],
    });
    expect(guardFunctionCapability(projection(), {
      functionCode: "WATER_MEASUREMENTS",
      action: "View",
      scope: { kind: "all-zones" },
    })).toEqual({ status: "denied" });
  });

  it("requires a true all-zones permission for cooperative-wide data", () => {
    expect(guardFunctionCapability(projection(), {
      functionCode: "PAYROLL",
      action: "View",
      scope: { kind: "all-zones" },
    })).toEqual({ status: "granted", dataScopes: ["AssignedZone"] });
  });

  it.each([
    null,
    {},
    { functionCode: "UNKNOWN", action: "View", scope: { kind: "all-zones" } },
    { functionCode: "PAYROLL", action: "Delete", scope: { kind: "all-zones" } },
    { functionCode: "PAYROLL", action: "View", scope: { kind: "zone", zoneId: "bad" } },
    { functionCode: "PAYROLL", action: "View", scope: { kind: "global" } },
  ])("rejects malformed or unsupported requirements %#", (requirement) => {
    expect(guardFunctionCapability(projection(), requirement)).toEqual({
      status: "invalid-requirement",
    });
  });

  it("denies a supported action that was not granted", () => {
    expect(guardFunctionCapability(projection(), {
      functionCode: "WATER_MEASUREMENTS",
      action: "Create",
      scope: { kind: "zone", zoneId: zoneA },
    })).toEqual({ status: "denied" });
  });

  it("returns a frozen decision instead of raw permission entries", () => {
    const result = guardFunctionCapability(projection(), {
      functionCode: "PAYROLL",
      action: "View",
      scope: { kind: "all-zones" },
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "granted") expect(Object.isFrozen(result.dataScopes)).toBe(true);
    expect(result).not.toHaveProperty("permissions");
    expect(result).not.toHaveProperty("role");
  });

  it("denies discovery for a permission with no assigned zones", () => {
    const input = projection();
    const empty: PermissionProjection = {
      ...input,
      functionPermissions: [{ ...input.functionPermissions[0], scope: { kind: "zones", zoneIds: [] } }],
    };
    expect(guardFunctionCapability(empty, {
      functionCode: "WATER_MEASUREMENTS", action: "View", scope: { kind: "any-assigned-zone" },
    })).toEqual({ status: "denied" });
  });

  it("rejects a throwing requirement getter without exposing its error", () => {
    expect(guardFunctionCapability(projection(), {
      get functionCode() { throw new Error("private-requirement"); },
    })).toEqual({ status: "invalid-requirement" });
  });
});
