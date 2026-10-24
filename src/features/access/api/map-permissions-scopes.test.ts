import { describe, expect, it } from "vitest";
import { mapPermissionsResponse } from "@/features/access/api/map-permissions-response";
import { accountId, grant, permission, staffPayload, summary, zoneA, zoneB } from "@/features/access/api/__fixtures__/permissions";

function project(input: unknown) {
  const result = mapPermissionsResponse(input, accountId);
  if (result.status !== "mapped") throw new Error(`Expected projection, got ${result.status}`);
  return result.projection.functionPermissions;
}

describe("action-specific permission scopes", () => {
  it("does not merge scopes across different functions", () => {
    const input = staffPayload({
      functions: [summary(), summary({ function: "HARVESTS", allZones: true, zoneIds: [] })],
      grants: [grant(), grant({
        allZones: true, zoneId: null, permissions: [permission({ functionCode: "HARVESTS" })],
      })],
    });
    const entries = project(input);
    expect(entries.find((entry) => entry.functionCode === "WATER_MEASUREMENTS")?.scope)
      .toEqual({ kind: "zones", zoneIds: [zoneA] });
    expect(entries.find((entry) => entry.functionCode === "HARVESTS")?.scope)
      .toEqual({ kind: "all-zones" });
  });

  it("keeps View everywhere separate from Edit in zone A", () => {
    const entries = project(staffPayload({
      functions: [summary({ allZones: true, zoneIds: [], actions: ["View", "Edit"] })],
      grants: [
        grant({ zoneId: null, allZones: true }),
        grant({ permissions: [permission({ canEdit: true })] }),
      ],
    }));
    expect(entries).toEqual([
      { functionCode: "WATER_MEASUREMENTS", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } },
      { functionCode: "WATER_MEASUREMENTS", action: "Edit", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [zoneA] } },
    ]);
  });

  it("does not let an all-zones Edit grant widen a separate View grant", () => {
    const entries = project(staffPayload({
      functions: [summary({ allZones: true, zoneIds: [], actions: ["View", "Edit"] })],
      grants: [grant(), grant({ zoneId: null, allZones: true, permissions: [permission({ canView: false, canEdit: true })] })],
    }));
    expect(entries.find((entry) => entry.action === "View")?.scope).toEqual({ kind: "zones", zoneIds: [zoneA] });
    expect(entries.find((entry) => entry.action === "Edit")?.scope).toEqual({ kind: "all-zones" });
  });

  it("unions multiple roles and zones only for the same function/action/dataScope", () => {
    const entries = project(staffPayload({
      functions: [summary({ zoneIds: [zoneA, zoneB] })],
      grants: [grant(), grant({ zoneId: zoneB }), grant({ zoneId: zoneA.toUpperCase() })],
    }));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.scope).toEqual({ kind: "zones", zoneIds: [zoneA, zoneB] });
  });

  it("preserves OwnRecords independently even when its zone scope is broader", () => {
    const entries = project(staffPayload({
      functions: [summary({ allZones: true, zoneIds: [] })],
      grants: [grant({ allZones: true, zoneId: null, permissions: [permission({ dataScope: "OwnRecords" })] }), grant()],
    }));
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.dataScope === "OwnRecords")?.scope).toEqual({ kind: "all-zones" });
    expect(entries.find((entry) => entry.dataScope === "AssignedZone")?.scope).toEqual({ kind: "zones", zoneIds: [zoneA] });
  });

  it("does not grant access from a summary alone or an absent action", () => {
    expect(project(staffPayload({ grants: [] }))).toEqual([]);
    expect(project(staffPayload({ functions: [summary({ actions: ["Edit"] })] }))).toEqual([]);
  });

  it("intersects advertised summary scope without using it to widen a grant", () => {
    expect(project(staffPayload({ functions: [summary({ zoneIds: [zoneB] })] }))).toEqual([]);
    const entries = project(staffPayload({ grants: [grant({ zoneId: null, allZones: true })] }));
    expect(entries[0]?.scope).toEqual({ kind: "zones", zoneIds: [zoneA] });
  });

  it("requires all-zones grants for cooperative-wide payroll permissions", () => {
    const functions = [summary({ function: "PAYROLL", allZones: true, zoneIds: [] })];
    const permissions = [permission({ functionCode: "PAYROLL" })];
    expect(project(staffPayload({ functions, grants: [grant({ permissions })] }))).toEqual([]);
    const entries = project(staffPayload({ functions, grants: [grant({ permissions, allZones: true, zoneId: null })] }));
    expect(entries[0]?.scope).toEqual({ kind: "all-zones" });
  });
});
