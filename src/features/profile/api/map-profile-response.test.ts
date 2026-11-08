import { describe, expect, it } from "vitest";
import { mapProfileResponse } from "@/features/profile/api/map-profile-response";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const dto = {
  accountId: id, username: "qa.user", displayName: "Nguyễn Ánh",
  subjectType: "Staff", email: null, emailVerified: false,
  phoneNumber: null, phoneVerified: false, grants: [], rowVersion: "opaque:version/+1=",
};

describe("profile DTO to domain mapping", () => {
  it("preserves identity, Unicode and opaque version without inventing contacts or grants", () => {
    expect(mapProfileResponse(dto, id)).toEqual({
      status: "mapped",
      profile: {
        accountId: id, username: dto.username, displayName: dto.displayName,
        email: null, phone: null, roles: [], recordVersion: dto.rowVersion,
      },
    });
  });

  it("preserves each actual contact's verification state", () => {
    const result = mapProfileResponse({
      ...dto, email: "qa@example.test", emailVerified: true,
      phoneNumber: "+84900000000", phoneVerified: false,
    }, id);
    expect(result).toMatchObject({
      status: "mapped", profile: {
        email: { value: "qa@example.test", isVerified: true },
        phone: { value: "+84900000000", isVerified: false },
      },
    });
  });

  it("treats GUID casing as the same identity but rejects another account", () => {
    expect(mapProfileResponse(dto, id.toUpperCase()).status).toBe("mapped");
    expect(mapProfileResponse(dto, "b22bb318-a72e-49aa-a8d7-a6169f889007"))
      .toEqual({ status: "account-mismatch" });
  });

  it("maps role labels only as presentation, never EffectiveAccess", () => {
    const result = mapProfileResponse({ ...dto, grants: [
      { role: "Vai trò tuỳ chỉnh", zoneId: id, zoneName: "Vùng Đông", allZones: false },
      { role: "Kế toán", zoneId: null, zoneName: null, allZones: true },
      { role: "Xem dữ liệu", zoneId: id, zoneName: null, allZones: false },
    ] }, id);
    expect(result).toMatchObject({ status: "mapped", profile: { roles: [
      { roleLabel: "Vai trò tuỳ chỉnh", zoneId: id, scopeLabel: "Vùng Đông" },
      { roleLabel: "Kế toán", zoneId: null, scopeLabel: "Toàn bộ vùng nuôi" },
      { roleLabel: "Xem dữ liệu", zoneId: id, scopeLabel: "Vùng chưa có tên" },
    ] } });
    if (result.status === "mapped") expect(result.profile).not.toHaveProperty("access");
  });

  it.each([
    { rowVersion: "" }, { rowVersion: " " }, { rowVersion: 123 },
    { accountId: "invalid" }, { phoneNumber: undefined },
    { email: null, emailVerified: true }, { phoneNumber: null, phoneVerified: true },
    { email: " " }, { phoneNumber: "" },
    { grants: [{ role: "QA", zoneId: null, zoneName: null, allZones: false }] },
    { grants: [{ role: "QA", zoneId: id, zoneName: "Đông", allZones: true }] },
  ])("rejects invalid or contradictory data without returning a partial profile: %j", (change) => {
    expect(mapProfileResponse({ ...dto, ...change }, id)).toEqual({ status: "invalid-profile" });
  });

  it("does not mutate the response or expose additive fields", () => {
    const input = { ...dto, privateField: "do-not-forward" };
    const original = structuredClone(input);
    const result = mapProfileResponse(input, id);
    expect(input).toEqual(original);
    if (result.status === "mapped") expect(result.profile).not.toHaveProperty("privateField");
  });
});
