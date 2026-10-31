import { describe, expect, it } from "vitest";

import { createMockAccountRecoveryEnvironment } from "@/features/account-recovery/repositories/mock-account-recovery-environment";

describe("mock account recovery environment", () => {
  it("cancels the old code when the user changes identifier", async () => {
    const environment = createMockAccountRecoveryEnvironment({
      latencyMs: 0,
      verification: { latencyMs: 0 },
    });
    const started = await environment.accountRecoveryService.start({
      channel: "email",
      identifier: "duythai@example.com",
    });

    await environment.accountRecoveryService.cancel(started.challenge.requestId);

    await expect(
      environment.verificationService.verify({
        code: "123456",
        requestId: started.challenge.requestId,
      }),
    ).resolves.toEqual({ reason: "request-not-found", status: "rejected" });
  });

  it("keeps a valid proof after a rejected password and consumes it on success", async () => {
    const environment = createMockAccountRecoveryEnvironment({
      latencyMs: 0,
      verification: { latencyMs: 0 },
    });
    const started = await environment.accountRecoveryService.start({
      channel: "sms",
      identifier: "+84 912 345 678",
    });
    const verified = await environment.verificationService.verify({
      code: "123456",
      requestId: started.challenge.requestId,
    });
    if (verified.status !== "verified") throw new Error("Expected valid proof");

    await expect(
      environment.accountRecoveryService.resetPassword({
        newPassword: "too-short",
        verificationToken: verified.token,
      }),
    ).resolves.toMatchObject({ reason: "invalid-new-password" });
    await expect(
      environment.accountRecoveryService.resetPassword({
        newPassword: "Matkhau1",
        verificationToken: verified.token,
      }),
    ).resolves.toEqual({ status: "password-reset" });
    await expect(
      environment.accountRecoveryService.resetPassword({
        newPassword: "Matkhau1",
        verificationToken: verified.token,
      }),
    ).resolves.toMatchObject({ reason: "verification-invalid" });
  });

  it("returns the same public start shape when delivery fails", async () => {
    const environment = createMockAccountRecoveryEnvironment({
      latencyMs: 0,
      verification: {
        latencyMs: 0,
        shouldFailDelivery: () => true,
      },
    });

    const result = await environment.accountRecoveryService.start({
      channel: "email",
      identifier: "unknown@example.com",
    });

    expect(result).toMatchObject({
      challenge: { purpose: "recovery" },
      message: { code: "MSG15" },
      status: "verification-pending",
    });
    expect(result.challenge.requestId).toMatch(/^mock-verification-/);
    expect(result.challenge.requestId).not.toContain("dummy");
    expect(JSON.stringify(result)).not.toMatch(/deliveryFailed|accountExists|eligible/);
  });
});
