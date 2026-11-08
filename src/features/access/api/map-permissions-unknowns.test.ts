import { describe, expect, it } from "vitest";
import { mapPermissionsResponse } from "@/features/access/api/map-permissions-response";
import { accountId, grant, permission, staffPayload, summary } from "@/features/access/api/__fixtures__/permissions";

describe("fail-closed function/action mapping", () => {
  it.each(["FUTURE_FUNCTION", "__proto__", "constructor", "MANAGE_ACCOUNTS"])(
    "does not grant any capability for unknown function %s", (functionCode) => {
      const input = staffPayload({
        functions: [summary({ function: functionCode })],
        grants: [grant({ permissions: [permission({ functionCode })] })],
      });
      expect(mapPermissionsResponse(input, accountId)).toEqual({ status: "mapped", projection: {
        access: { permissions: [] }, functionPermissions: [],
      } });
    },
  );

  it("rejects unknown action enums instead of treating them as CRUD", () => {
    const input = staffPayload();
    const invalid = { ...input, functions: [{ ...input.functions[0], actions: ["Finalize"] }] };
    expect(mapPermissionsResponse(invalid, accountId)).toEqual({ status: "invalid-permissions" });
  });

  it("does not turn an unknown record restriction into assigned-zone access", () => {
    const input = staffPayload();
    const invalid = { ...input, grants: [{
      ...input.grants[0], permissions: [{ ...permission(), dataScope: "FutureScope" }],
    }] };
    expect(mapPermissionsResponse(invalid, accountId)).toEqual({ status: "invalid-permissions" });
  });

  it("ignores a known action not supported on that function", () => {
    const input = staffPayload({
      functions: [summary({ actions: ["Delete"] })],
      grants: [grant({ permissions: [permission({ canView: false, canDelete: true })] })],
    });
    expect(mapPermissionsResponse(input, accountId)).toMatchObject({
      status: "mapped", projection: { functionPermissions: [] },
    });
  });

  it("keeps allowed supported other actions distinct from CRUD flags", () => {
    const input = staffPayload({
      functions: [summary({ actions: ["View", "Export"] })],
      grants: [grant({ permissions: [permission({ otherPermissions: ["Export"] })] })],
    });
    const result = mapPermissionsResponse(input, accountId);
    if (result.status !== "mapped") throw new Error("Expected projection");
    expect(result.projection.functionPermissions.map((entry) => entry.action)).toEqual(["View", "Export"]);
  });
});
