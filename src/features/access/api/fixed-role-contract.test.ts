import { describe, expect, it } from "vitest";
import { mapPermissionsResponse } from "./map-permissions-response";
import { accountId, grant, permission, staffPayload, summary } from "./__fixtures__/permissions";
function payload(roleCode?: "ZONE_MANAGER" | "ACCOUNTANT") {
  return staffPayload({ functions: [summary({ function: "SUPPLIER_PAYMENTS", allZones: true, zoneIds: [] })], grants: [{ ...grant(), roleCode, permissions: [{ ...permission({ functionCode: "SUPPLIER_PAYMENTS" }), dataScope: undefined }] }] });
}
describe("approved fixed-role contract", () => {
  it("allows cooperative-wide payments from one-zone Accountant only with matching effective summary", () => {
    const result = mapPermissionsResponse(payload("ACCOUNTANT"), accountId);
    expect(result).toMatchObject({ status: "mapped", projection: { functionPermissions: [{ functionCode: "SUPPLIER_PAYMENTS", action: "View", scope: { kind: "all-zones" }, dataScope: "AssignedZone" }] } });
  });
  it("does not infer fixed-role semantics from a display name or missing legacy scope", () => {
    expect(mapPermissionsResponse(payload(), accountId).status).toBe("invalid-permissions");
  });
  it("requires the effective backend function summary, even for a known fixed role", () => {
    const result = mapPermissionsResponse({ ...payload("ACCOUNTANT"), functions: [] }, accountId);
    expect(result).toMatchObject({ status: "mapped", projection: { functionPermissions: [] } });
  });
});
