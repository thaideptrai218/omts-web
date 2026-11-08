import { describe, expect, it } from "vitest";
import { parseBffSessionResponse } from "./bff-session.schema";
import { authenticatedSnapshot } from "./__fixtures__/bff-session";

describe("browser BFF session contract", () => {
  it("preserves function/action/zone and record scope without inventing account labels", () => {
    const input = authenticatedSnapshot();
    const result = parseBffSessionResponse(200, input);
    expect(result).toEqual(input);
    if (result.status !== "authenticated") throw new Error("Expected session");
    expect(result.permissions.functionPermissions.map((entry) => entry.dataScope)).toEqual(["OwnRecords", "AssignedZone"]);
    expect(result.identity).not.toHaveProperty("displayName");
    expect(result.identity).not.toHaveProperty("organizationName");
  });

  it.each([
    [401, { status: "anonymous", clearCookie: false }],
    [401, { status: "anonymous", clearCookie: true }],
    [403, { status: "onboarding-required", phase: "password-change-required", destination: "/onboarding/password" }],
    [403, { status: "onboarding-required", phase: "contact-verification-required", destination: "/onboarding/contact" }],
    [503, { status: "unavailable" }],
  ])("accepts the existing BFF response %j / %j", (status, input) => {
    expect(parseBffSessionResponse(status as number, input)).toEqual(input);
  });

  it.each([201, 204, 401, 403, 500, 503])("does not trust an authenticated body with HTTP %s", (status) => {
    expect(parseBffSessionResponse(status, authenticatedSnapshot())).toEqual({ status: "invalid-response" });
  });

  const valid = authenticatedSnapshot();
  const functionPermission = valid.permissions.functionPermissions[0];
  it.each([
    null, {}, { ...valid, accessToken: "private-fixture" }, { ...valid, refreshToken: "private-fixture" },
    { ...valid, identity: { ...valid.identity, sessionId: valid.identity.accountId } },
    { ...valid, identity: { ...valid.identity, displayName: "An invented name" } },
    { ...valid, identity: { ...valid.identity, subjectType: "Manager" } },
    { ...valid, identity: { ...valid.identity, accountId: "not-an-id" } },
    { ...valid, permissions: { ...valid.permissions, functionPermissions: [{ ...functionPermission, scope: { kind: "global" } }] } },
    { ...valid, permissions: { ...valid.permissions, functionPermissions: [{ ...functionPermission, scope: { kind: "zones", zoneIds: [] } }] } },
    { ...valid, permissions: { ...valid.permissions, functionPermissions: [{ ...functionPermission, action: "Execute" }] } },
    { ...valid, permissions: { ...valid.permissions, functionPermissions: [{ ...functionPermission, dataScope: "WholeCooperative" }] } },
    { ...valid, permissions: { ...valid.permissions, access: { permissions: [{ key: "unknown.key", scope: { kind: "all-zones" } }] } } },
    { status: "onboarding-required", phase: "password-change-required", destination: "/dashboard" },
    { status: "onboarding-required", phase: "contact-verification-required", destination: "https://foreign.example" },
    { status: "onboarding-required", phase: "application", destination: "/dashboard" },
    { status: "anonymous" }, { status: "unavailable", detail: "raw-upstream-detail" },
  ])("rejects malformed contracts and fields outside the browser DTO %#", (input) => {
    const status = input?.status === "onboarding-required" ? 403 : input?.status === "anonymous" ? 401
      : input?.status === "unavailable" ? 503 : 200;
    expect(parseBffSessionResponse(status, input)).toEqual({ status: "invalid-response" });
  });

  it("accepts no permissions without deriving rights from Staff or Owner labels", () => {
    const input = { ...valid, permissions: { access: { permissions: [] }, functionPermissions: [] } };
    expect(parseBffSessionResponse(200, input)).toEqual(input);
    expect(parseBffSessionResponse(200, { ...input, identity: { ...input.identity, subjectType: "CooperativeOwner" } }))
      .toMatchObject({ permissions: { access: { permissions: [] }, functionPermissions: [] } });
  });
});
