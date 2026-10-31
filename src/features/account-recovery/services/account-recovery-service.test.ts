import { describe, expect, it, vi } from "vitest";

import type { RecoveryChallenge } from "@/features/account-recovery/domain/account-recovery";
import type { AccountRecoveryRepository } from "@/features/account-recovery/repositories/account-recovery-repository";
import { createAccountRecoveryService } from "@/features/account-recovery/services/account-recovery-service";

const challenge: RecoveryChallenge = {
  expiresAtMs: 300_000,
  purpose: "recovery",
  recipient: {
    channel: "email",
    maskedValue: "du***@example.com",
  },
  requestId: "public-recovery-request",
  resendAvailableAtMs: 60_000,
  sendsRemaining: 2,
};

describe("account recovery service", () => {
  it("returns one public start shape without account eligibility fields", async () => {
    const startResult = {
      challenge,
      message: { code: "MSG15" },
      status: "verification-pending",
    } as const;
    const repository: AccountRecoveryRepository = {
      cancel: vi.fn(),
      resetPassword: vi.fn(),
      start: vi.fn().mockResolvedValue(startResult),
    };
    const service = createAccountRecoveryService(repository);

    const result = await service.start({
      channel: "email",
      identifier: "duythai@example.com",
    });

    expect(result).toEqual(startResult);
    expect(result.challenge.purpose).toBe("recovery");
    expect(JSON.stringify(result)).not.toMatch(
      /accountExists|deliveryFailed|eligible|locked|verified/,
    );
    expect(repository.resetPassword).not.toHaveBeenCalled();
  });

  it("passes only the opaque proof and new password to reset", async () => {
    const repository: AccountRecoveryRepository = {
      cancel: vi.fn(),
      resetPassword: vi.fn().mockResolvedValue({ status: "password-reset" }),
      start: vi.fn(),
    };
    const service = createAccountRecoveryService(repository);
    const input = {
      newPassword: "Matkhau1",
      verificationToken: "opaque-recovery-proof",
    } as const;

    await expect(service.resetPassword(input)).resolves.toEqual({
      status: "password-reset",
    });
    expect(repository.resetPassword).toHaveBeenCalledWith(input);
    expect(repository.start).not.toHaveBeenCalled();
    expect(input).not.toHaveProperty("confirmPassword");
  });

  it("keeps invalid proof and invalid password as distinct typed outcomes", async () => {
    const resetPassword = vi
      .fn()
      .mockResolvedValueOnce({
        message: { code: "MSG16" },
        reason: "verification-invalid",
        status: "rejected",
      })
      .mockResolvedValueOnce({
        message: { code: "MSG01" },
        reason: "invalid-new-password",
        status: "rejected",
      });
    const repository: AccountRecoveryRepository = {
      cancel: vi.fn(),
      resetPassword,
      start: vi.fn(),
    };
    const service = createAccountRecoveryService(repository);
    const input = {
      newPassword: "Matkhau1",
      verificationToken: "opaque-recovery-proof",
    } as const;

    await expect(service.resetPassword(input)).resolves.toMatchObject({
      message: { code: "MSG16" },
      reason: "verification-invalid",
    });
    await expect(service.resetPassword(input)).resolves.toMatchObject({
      message: { code: "MSG01" },
      reason: "invalid-new-password",
    });
  });
});
