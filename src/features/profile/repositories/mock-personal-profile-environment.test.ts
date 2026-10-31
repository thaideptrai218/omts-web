import { describe, expect, it } from "vitest";
import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";

async function verifyCandidate(
  environment: ReturnType<typeof createMockPersonalProfileEnvironment>,
  kind: "email" | "phone",
  value: string,
) {
  const started = await environment.profileService.startIdentifierChange({
    kind,
    value,
  });
  expect(started.status).toBe("verification-started");
  if (started.status !== "verification-started") {
    throw new Error("Expected a verification challenge.");
  }

  const verified = await environment.verificationService.verify({
    code: "123456",
    requestId: started.challenge.requestId,
  });
  expect(verified.status).toBe("verified");
  if (verified.status !== "verified") {
    throw new Error("Expected a verification token.");
  }

  return verified.token;
}

describe("mock personal profile environment", () => {
  it("rejects an overlong name without changing the profile or consuming verified contact proof", async () => {
    const environment = createMockPersonalProfileEnvironment({ latencyMs: 0, verification: { latencyMs: 0 } });
    const loaded = await environment.profileService.load();
    if (loaded.status !== "loaded") throw new Error("Expected profile");
    const value = "candidate@omts.test";
    const token = await verifyCandidate(environment, "email", value);
    const input = { displayName: "a".repeat(201), recordVersion: loaded.profile.recordVersion, emailChange: { token, value } };
    expect(await environment.profileService.save(input)).toMatchObject({ status: "invalid-change", field: "displayName" });
    expect(await environment.profileService.load()).toEqual(loaded);
    expect(await environment.profileService.save({ ...input, displayName: "Tên hợp lệ" })).toMatchObject({ status: "saved", profile: { email: { value, isVerified: true } } });
  });
  it("loads the current profile and saves a verified email candidate", async () => {
    const environment = createMockPersonalProfileEnvironment({
      latencyMs: 0,
      verification: { latencyMs: 0 },
    });
    const loaded = await environment.profileService.load();
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("Expected profile.");

    const token = await verifyCandidate(
      environment,
      "email",
      "new-owner@omts.test",
    );
    const saved = await environment.profileService.save({
      displayName: "Chủ HTX Trung Nam",
      emailChange: { token, value: "new-owner@omts.test" },
      recordVersion: loaded.profile.recordVersion,
    });

    expect(saved.status).toBe("saved");
    if (saved.status !== "saved") throw new Error("Expected saved profile.");
    expect(saved.profile.email).toEqual({
      isVerified: true,
      value: "new-owner@omts.test",
    });
    expect(saved.profile.recordVersion).not.toBe(loaded.profile.recordVersion);

    const reused = await environment.profileService.save({
      displayName: "Chủ HTX Trung Nam",
      emailChange: { token, value: "another@omts.test" },
      recordVersion: saved.profile.recordVersion,
    });
    expect(reused).toMatchObject({
      field: "email",
      message: { code: "MSG16" },
      status: "invalid-change",
    });
  });

  it("rejects current or already-used identifiers before sending a code", async () => {
    const environment = createMockPersonalProfileEnvironment({ latencyMs: 0 });

    await expect(
      environment.profileService.startIdentifierChange({
        kind: "email",
        value: "owner@omts.test",
      }),
    ).resolves.toMatchObject({ field: "email", status: "invalid-identifier" });
    await expect(
      environment.profileService.startIdentifierChange({
        kind: "phone",
        value: "0999999999",
      }),
    ).resolves.toMatchObject({ field: "phone", status: "invalid-identifier" });
  });

  it("maps a verification delivery failure to MSG04", async () => {
    const environment = createMockPersonalProfileEnvironment({
      latencyMs: 0,
      verification: {
        latencyMs: 0,
        shouldFailDelivery: () => true,
      },
    });

    await expect(
      environment.profileService.startIdentifierChange({
        kind: "email",
        value: "new@omts.test",
      }),
    ).resolves.toEqual({ message: { code: "MSG04" }, status: "delivery-failed" });
  });

  it("returns MSG06 instead of overwriting a newer record", async () => {
    const environment = createMockPersonalProfileEnvironment({ latencyMs: 0 });
    const loaded = await environment.profileService.load();
    if (loaded.status !== "loaded") throw new Error("Expected profile.");

    environment.controls.simulateExternalUpdate("Tên từ thiết bị khác");
    const result = await environment.profileService.save({
      displayName: "Tên đang sửa",
      recordVersion: loaded.profile.recordVersion,
    });

    expect(result).toMatchObject({ message: { code: "MSG06" }, status: "conflict" });
    const latest = await environment.profileService.load();
    expect(latest).toMatchObject({
      profile: { displayName: "Tên từ thiết bị khác" },
      status: "loaded",
    });
  });

  it("does not consume one valid proof when another change is invalid", async () => {
    const environment = createMockPersonalProfileEnvironment({
      latencyMs: 0,
      verification: { latencyMs: 0 },
    });
    const loaded = await environment.profileService.load();
    if (loaded.status !== "loaded") throw new Error("Expected profile.");
    const emailToken = await verifyCandidate(
      environment,
      "email",
      "atomic@omts.test",
    );

    const rejected = await environment.profileService.save({
      displayName: loaded.profile.displayName,
      emailChange: { token: emailToken, value: "atomic@omts.test" },
      phoneChange: { token: "fake-token", value: "0911111111" },
      recordVersion: loaded.profile.recordVersion,
    });
    expect(rejected).toMatchObject({ field: "phone", status: "invalid-change" });

    const saved = await environment.profileService.save({
      displayName: loaded.profile.displayName,
      emailChange: { token: emailToken, value: "atomic@omts.test" },
      recordVersion: loaded.profile.recordVersion,
    });
    expect(saved.status).toBe("saved");
  });

  it("supports session expiry and the Trader ambiguous-history notice", async () => {
    let isSessionActive = false;
    const expired = createMockPersonalProfileEnvironment({
      isSessionActive: () => isSessionActive,
      latencyMs: 0,
    });
    await expect(expired.profileService.load()).resolves.toMatchObject({
      message: { code: "MSG19" },
      status: "session-expired",
    });

    isSessionActive = true;
    const environment = createMockPersonalProfileEnvironment({
      isAmbiguousTraderPhone: () => true,
      latencyMs: 0,
      verification: { latencyMs: 0 },
    });
    const loaded = await environment.profileService.load();
    if (loaded.status !== "loaded") throw new Error("Expected profile.");
    const token = await verifyCandidate(environment, "phone", "0911111111");
    const result = await environment.profileService.save({
      displayName: loaded.profile.displayName,
      phoneChange: { token, value: "0911111111" },
      recordVersion: loaded.profile.recordVersion,
    });

    expect(result).toMatchObject({
      notice: { code: "MSG57" },
      status: "saved",
    });
  });
});
