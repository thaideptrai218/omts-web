import { describe, expect, it } from "vitest";
import {
  profileUpdatedSchema,
  profileViewSchema,
  updateProfileRequestSchema,
} from "@/features/profile/api/profile-contract.schemas";

const profile = {
  accountId: "122bb318-a72e-49aa-a8d7-a6169f889007",
  username: "qa.user", displayName: "Người dùng kiểm thử", subjectType: "Staff",
  email: null, emailVerified: false, phoneNumber: null, phoneVerified: false,
  grants: [], rowVersion: "opaque-version-do-not-decode",
};

describe("profile wire contract at backend 48ae1e0", () => {
  it("accepts missing contacts represented as explicit null without inventing values", () => {
    expect(profileViewSchema.parse(profile)).toEqual(profile);
  });

  it("keeps Unicode, verified flags and opaque rowVersion unchanged", () => {
    const input = {
      ...profile, email: "qa@example.test", emailVerified: true,
      phoneNumber: "+84900000000", phoneVerified: true,
      grants: [{ role: "Kế toán", allZones: true, zoneId: null, zoneName: null }],
    };
    expect(profileViewSchema.parse(input)).toEqual(input);
  });

  it.each([
    { accountId: "bad-id" }, { phoneNumber: undefined }, { emailVerified: "true" },
    { rowVersion: "" }, { rowVersion: undefined }, { displayName: " " },
    { subjectType: "FutureActor" }, { grants: null },
  ])("rejects incomplete or malformed profile fields: %j", (change) => {
    expect(profileViewSchema.safeParse({ ...profile, ...change }).success).toBe(false);
  });

  it("parses the controller update envelope rather than the incorrect Swagger annotation", () => {
    const response = { profile, message: "Personal profile saved." };
    expect(profileUpdatedSchema.parse(response)).toEqual(response);
    expect(profileUpdatedSchema.safeParse(profile).success).toBe(false);
    expect(profileUpdatedSchema.safeParse({ profile: null, message: "saved" }).success).toBe(false);
  });

  it("strips additive fields, including credentials that do not belong in a profile DTO", () => {
    expect(profileViewSchema.parse({ ...profile, accessToken: "fixture-only" })).toEqual(profile);
  });

  it("describes the name-only PUT boundary without changing UI validation", () => {
    const request = { displayName: "Tên mới", rowVersion: profile.rowVersion };
    expect(updateProfileRequestSchema.parse(request)).toEqual(request);
    for (const extra of [
      { username: "other" }, { email: "new@example.test" }, { phoneNumber: "+84900000000" },
    ]) {
      expect(updateProfileRequestSchema.safeParse({ ...request, ...extra }).success).toBe(false);
    }
    expect(updateProfileRequestSchema.safeParse({ ...request, displayName: "x".repeat(200) }).success).toBe(true);
    expect(updateProfileRequestSchema.safeParse({ ...request, displayName: "x".repeat(201) }).success).toBe(false);
  });
});
