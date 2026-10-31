import { describe, expect, it } from "vitest";
import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";

const profile: PersonalProfile = {
  accountId: "account-null-contact", username: "qa.user", displayName: "Người kiểm thử",
  email: null, phone: null, roles: [], recordVersion: "profile-v1",
};

describe("mock profile parity with nullable contacts", () => {
  it("loads and saves the name without converting absent contacts into empty objects", async () => {
    const environment = createMockPersonalProfileEnvironment({ initialProfile: profile, latencyMs: 0 });
    const loaded = await environment.profileService.load();
    expect(loaded).toMatchObject({ status: "loaded", profile: { email: null, phone: null } });
    const saved = await environment.profileService.save({ displayName: "Tên mới", recordVersion: profile.recordVersion });
    expect(saved).toMatchObject({ status: "saved", profile: { displayName: "Tên mới", email: null, phone: null } });
  });

  it("keeps cloned contacts and roles isolated between reads", async () => {
    const environment = createMockPersonalProfileEnvironment({
      initialProfile: { ...profile, phone: { value: "+84900000000", isVerified: false } }, latencyMs: 0,
    });
    const first = await environment.profileService.load();
    const second = await environment.profileService.load();
    if (first.status !== "loaded" || second.status !== "loaded") throw new Error("Expected profiles");
    expect(first.profile.phone).not.toBe(second.profile.phone);
    expect(first.profile.roles).not.toBe(second.profile.roles);
    expect(first.profile.phone).toEqual(second.profile.phone);
  });

  it("can start adding a first contact without bypassing verification", async () => {
    const environment = createMockPersonalProfileEnvironment({
      initialProfile: profile, latencyMs: 0, verification: { latencyMs: 0 },
    });
    await expect(environment.profileService.startIdentifierChange({ kind: "phone", value: "+84900000000" }))
      .resolves.toMatchObject({ status: "verification-started" });
    await expect(environment.profileService.load()).resolves.toMatchObject({ profile: { phone: null } });
  });
});
