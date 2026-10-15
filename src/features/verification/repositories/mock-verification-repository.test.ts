import { describe, expect, it } from "vitest";

import type { StartVerificationInput } from "@/features/verification/domain/verification-types";
import { createMockVerificationRepository } from "@/features/verification/repositories/mock-verification-repository";

const startInput: StartVerificationInput = {
  purpose: "registration",
  recipient: {
    channel: "email",
    maskedValue: "du***@example.com",
    value: "duythai@example.com",
  },
};

async function startRequest(
  repository: ReturnType<typeof createMockVerificationRepository>,
) {
  const result = await repository.start(startInput);
  if (result.status !== "started") throw new Error("Expected mock request to start");
  return result.challenge;
}

describe("mock verification repository", () => {
  it("returns only the masked recipient in a challenge", async () => {
    const repository = createMockVerificationRepository({ latencyMs: 0, now: () => 0 });
    const challenge = await startRequest(repository);

    expect(challenge.recipient).toEqual({
      channel: "email",
      maskedValue: "du***@example.com",
    });
    expect(JSON.stringify(challenge)).not.toContain("duythai@example.com");
    expect(challenge.sendsRemaining).toBe(2);
  });

  it("locks the request on the fifth wrong entry", async () => {
    const repository = createMockVerificationRepository({ latencyMs: 0 });
    const challenge = await startRequest(repository);

    for (let attempt = 1; attempt < 5; attempt += 1) {
      const result = await repository.verify({ code: "000000", requestId: challenge.requestId });
      expect(result).toMatchObject({
        attemptsRemaining: 5 - attempt,
        reason: "invalid-or-expired",
        status: "rejected",
      });
    }

    await expect(
      repository.verify({ code: "000000", requestId: challenge.requestId }),
    ).resolves.toEqual({ reason: "attempt-limit-reached", status: "rejected" });
    await expect(
      repository.verify({ code: "123456", requestId: challenge.requestId }),
    ).resolves.toEqual({ reason: "attempt-limit-reached", status: "rejected" });
  });

  it("rejects an expired code without consuming another attempt", async () => {
    let currentTime = 0;
    const repository = createMockVerificationRepository({
      latencyMs: 0,
      now: () => currentTime,
    });
    const challenge = await startRequest(repository);
    currentTime = challenge.expiresAtMs;

    await expect(
      repository.verify({ code: "123456", requestId: challenge.requestId }),
    ).resolves.toEqual({
      attemptsRemaining: 5,
      reason: "invalid-or-expired",
      status: "rejected",
    });
  });

  it("enforces cooldown and invalidates the previous code after resend", async () => {
    let currentTime = 0;
    const repository = createMockVerificationRepository({
      latencyMs: 0,
      now: () => currentTime,
    });
    const challenge = await startRequest(repository);

    await expect(repository.resend(challenge.requestId)).resolves.toEqual({
      reason: "too-soon",
      retryAfterSeconds: 60,
      status: "rejected",
    });

    currentTime = challenge.resendAvailableAtMs;
    const resendResult = await repository.resend(challenge.requestId);
    expect(resendResult.status).toBe("resent");
    await expect(
      repository.verify({ code: "123456", requestId: challenge.requestId }),
    ).resolves.toMatchObject({ reason: "invalid-or-expired", status: "rejected" });
    await expect(
      repository.verify({ code: "654321", requestId: challenge.requestId }),
    ).resolves.toMatchObject({ status: "verified" });
  });

  it("allows only three sends in one request", async () => {
    let currentTime = 0;
    const repository = createMockVerificationRepository({
      latencyMs: 0,
      now: () => currentTime,
    });
    let challenge = await startRequest(repository);

    for (let resend = 0; resend < 2; resend += 1) {
      currentTime = challenge.resendAvailableAtMs;
      const result = await repository.resend(challenge.requestId);
      if (result.status !== "resent") throw new Error("Expected mock resend to succeed");
      challenge = result.challenge;
    }

    currentTime = challenge.resendAvailableAtMs;
    await expect(repository.resend(challenge.requestId)).resolves.toEqual({
      reason: "send-limit-reached",
      status: "rejected",
    });
  });

  it("keeps the current code valid when resend delivery fails", async () => {
    let currentTime = 0;
    const repository = createMockVerificationRepository({
      latencyMs: 0,
      now: () => currentTime,
      shouldFailDelivery: (operation) => operation === "resend",
    });
    const challenge = await startRequest(repository);
    currentTime = challenge.resendAvailableAtMs;

    await expect(repository.resend(challenge.requestId)).resolves.toEqual({
      reason: "delivery-failed",
      status: "rejected",
    });
    await expect(
      repository.verify({ code: "123456", requestId: challenge.requestId }),
    ).resolves.toMatchObject({ status: "verified" });
  });
});
