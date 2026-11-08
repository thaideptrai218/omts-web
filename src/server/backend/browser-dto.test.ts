import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { projectIdentityDto, projectPermissionsDto, projectProfileDto } from "./browser-dto";
import { staffPayload } from "../../features/access/api/__fixtures__/permissions";
import { accountId, otherAccountId, profileFixture, secretCanaries } from "./__tests__/serialization-fixtures";

const identity = () => ({ accountId, sessionId: otherAccountId, username: "fixture.user", subjectType: "Staff",
  accessToken: secretCanaries[0], nested: { password: secretCanaries[2] } });

describe("browser DTO allowlists, without publishing endpoints", () => {
  it("selects identity fields explicitly and omits backend sessionId", async () => {
    const result = projectIdentityDto(identity(), accountId);
    expect(result).toEqual({ status: "projected", dto: { accountId, username: "fixture.user", subjectType: "Staff" } });
    const body = await NextResponse.json(result).text();
    expect(body).not.toContain(otherAccountId);
    for (const secret of secretCanaries) expect(body).not.toContain(secret);
  });
  it("reuses the profile domain shape, preserves null contacts and opaque concurrency version", async () => {
    const result = projectProfileDto(profileFixture(), accountId);
    expect(result).toEqual({ status: "projected", dto: {
      accountId, username: "fixture.user", displayName: "Tên cá nhân fixture", email: null, phone: null,
      recordVersion: "opaque:version/+1=", roles: [{ roleLabel: "Vai trò fixture", zoneId: null, scopeLabel: "Toàn bộ vùng nuôi" }],
    } });
    const body = await NextResponse.json(result).text();
    for (const secret of secretCanaries) expect(body).not.toContain(secret);
    expect(body).not.toContain("accessToken");
    expect(body).not.toContain("refreshToken");
  });
  it("selects existing permission projection instead of raw grants/role strings", async () => {
    const input = staffPayload();
    const result = projectPermissionsDto({ ...input, password: secretCanaries[2], grants: input.grants.map((g) => ({
      ...g, role: secretCanaries[0], nested: { token: secretCanaries[1] },
      permissions: g.permissions.map((p) => ({ ...p, refreshToken: secretCanaries[1] })),
    })) }, accountId);
    expect(result.status).toBe("projected");
    expect(result).toMatchObject({ dto: { functionPermissions: [{ functionCode: "WATER_MEASUREMENTS", action: "View", dataScope: "AssignedZone" }] } });
    const body = await NextResponse.json(result).text();
    for (const secret of secretCanaries) expect(body).not.toContain(secret);
    expect(body).not.toContain('"grants"');
  });
  it.each([
    ["identity", projectIdentityDto, identity], ["profile", projectProfileDto, profileFixture],
    ["permissions", projectPermissionsDto, staffPayload],
  ] as const)("binds %s to the trusted account and tolerates GUID case only", (_label, project, fixture) => {
    expect(project(fixture(), otherAccountId)).toEqual({ status: "account-mismatch" });
    expect(project(fixture(), accountId.toUpperCase()).status).toBe("projected");
    expect(project(fixture(), " ")).toEqual({ status: "invalid-context" });
  });
  it.each([projectIdentityDto, projectProfileDto, projectPermissionsDto])("rejects malformed payload projector %# without raw issues", (project) => {
    expect(project({ accessToken: secretCanaries[0] }, accountId)).toEqual({ status: "invalid-data" });
    expect(project({ get accountId() { throw new Error(secretCanaries[1]); } }, accountId)).toEqual({ status: "invalid-data" });
  });
  it.each(["requiresPasswordChange", "requiresPhoneVerification"])("retains the existing permission gate %s", (flag) => {
    expect(projectPermissionsDto({ ...staffPayload(), [flag]: true }, accountId)).toEqual({ status: "gated" });
  });
  it("keeps OwnRecords separate and does not infer Owner access from a role label", () => {
    const input = staffPayload();
    input.grants[0].role = "CooperativeOwner";
    input.grants[0].permissions[0].dataScope = "OwnRecords";
    const result = projectPermissionsDto(input, accountId);
    expect(result.status).toBe("projected");
    if (result.status !== "projected") return;
    expect(result.dto.functionPermissions.some((p) => p.dataScope === "OwnRecords")).toBe(true);
    expect(result.dto.access.permissions.some((p) => p.key === "access.accounts.manage")).toBe(false);
  });
  it("returns fresh plain data without retaining the caller's nested objects or toJSON", () => {
    const input = { ...profileFixture(), toJSON() { return { password: secretCanaries[2] }; } };
    const result = projectProfileDto(input, accountId);
    input.grants[0].role = "changed";
    expect(result).toMatchObject({ dto: { roles: [{ roleLabel: "Vai trò fixture" }] } });
    expect(JSON.stringify(result)).not.toContain(secretCanaries[2]);
    if (result.status === "projected") expect(Object.getPrototypeOf(result.dto)).toBe(Object.prototype);
  });
  it("does not claim an allowed text field can never contain sensitive content", () => {
    // Structural allowlisting is not DLP: a server could put any string in displayName.
    const result = projectProfileDto({ ...profileFixture(), displayName: secretCanaries[0] }, accountId);
    expect(result).toMatchObject({ dto: { displayName: secretCanaries[0] } });
  });
});
