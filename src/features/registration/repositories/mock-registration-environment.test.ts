import { describe, expect, it } from "vitest";

import type { RegistrationDraft } from "@/features/registration/domain/registration";
import { createMockRegistrationEnvironment } from "@/features/registration/repositories/mock-registration-environment";

const draft: RegistrationDraft = {
  identifier: "trader@example.com",
  method: "email",
  password: "Matkhau1",
};

async function startAndVerify(
  environment: ReturnType<typeof createMockRegistrationEnvironment>,
  registrationDraft: RegistrationDraft = draft,
) {
  const startResult = await environment.registrationService.start(registrationDraft);
  if (startResult.status !== "verification-started") {
    throw new Error("Expected registration verification to start");
  }

  const verifyResult = await environment.verificationService.verify({
    code: "123456",
    requestId: startResult.challenge.requestId,
  });
  if (verifyResult.status !== "verified") {
    throw new Error("Expected the mock verification code to be accepted");
  }

  return {
    challenge: startResult.challenge,
    token: verifyResult.token,
  };
}

describe("mock registration environment", () => {
  it("starts verification without exposing the full recipient in the challenge", async () => {
    const environment = createMockRegistrationEnvironment({
      registration: { latencyMs: 0 },
      verification: { latencyMs: 0, now: () => 0 },
    });

    const result = await environment.registrationService.start(draft);

    expect(result).toMatchObject({
      challenge: {
        purpose: "registration",
        recipient: {
          channel: "email",
          maskedValue: "tr***@example.com",
        },
      },
      status: "verification-started",
    });
    expect(JSON.stringify(result)).not.toContain(draft.password);
    expect(JSON.stringify(result)).not.toContain(draft.identifier);
  });

  it("creates the account only after a matching verified proof", async () => {
    const environment = createMockRegistrationEnvironment({
      registration: { latencyMs: 0 },
      verification: { latencyMs: 0 },
    });
    const { token } = await startAndVerify(environment);

    await expect(
      environment.registrationService.complete({
        draft,
        verificationToken: token,
      }),
    ).resolves.toEqual({ status: "registered" });
    await expect(environment.registrationService.start(draft)).resolves.toMatchObject({
      reason: "identifier-already-registered",
      status: "rejected",
    });
  });

  it("rejects a missing, mismatched, or already-consumed proof", async () => {
    const environment = createMockRegistrationEnvironment({
      registration: { latencyMs: 0 },
      verification: { latencyMs: 0 },
    });
    const { challenge, token } = await startAndVerify(environment);
    const otherDraft = { ...draft, identifier: "other@example.com" };

    await expect(
      environment.registrationService.complete({
        draft: otherDraft,
        verificationToken: token,
      }),
    ).resolves.toMatchObject({
      reason: "verification-invalid",
      status: "rejected",
    });
    await expect(
      environment.registrationService.complete({
        draft,
        verificationToken: "unverified-proof",
      }),
    ).resolves.toMatchObject({
      reason: "verification-invalid",
      status: "rejected",
    });
    await expect(
      environment.registrationService.complete({
        draft,
        verificationToken: token,
      }),
    ).resolves.toEqual({ status: "registered" });

    await environment.verificationService.verify({
      code: "123456",
      requestId: challenge.requestId,
    });
    await expect(
      environment.registrationService.complete({
        draft: { ...draft, identifier: "another@example.com" },
        verificationToken: token,
      }),
    ).resolves.toMatchObject({
      reason: "verification-invalid",
      status: "rejected",
    });
  });

  it("maps delivery failure and identifier conflicts to typed outcomes", async () => {
    const deliveryFailure = createMockRegistrationEnvironment({
      registration: { latencyMs: 0 },
      verification: {
        latencyMs: 0,
        shouldFailDelivery: (operation) => operation === "start",
      },
    });
    await expect(deliveryFailure.registrationService.start(draft)).resolves.toMatchObject({
      reason: "verification-delivery-failed",
      status: "rejected",
    });

    const existingIdentifier = createMockRegistrationEnvironment({
      registration: {
        existingIdentifiers: [draft.identifier],
        latencyMs: 0,
      },
      verification: { latencyMs: 0 },
    });
    await expect(existingIdentifier.registrationService.start(draft)).resolves.toMatchObject({
      reason: "identifier-already-registered",
      status: "rejected",
    });
  });

  it("represents a duplicate race at completion without exposing the password", async () => {
    let observedIdentity: unknown;
    const environment = createMockRegistrationEnvironment({
      registration: {
        latencyMs: 0,
        shouldConflictOnComplete: (identity) => {
          observedIdentity = identity;
          return true;
        },
      },
      verification: { latencyMs: 0 },
    });
    const { token } = await startAndVerify(environment);

    await expect(
      environment.registrationService.complete({
        draft,
        verificationToken: token,
      }),
    ).resolves.toMatchObject({
      reason: "identifier-already-registered",
      status: "rejected",
    });
    expect(observedIdentity).toEqual({
      identifier: draft.identifier,
      method: draft.method,
    });
    expect(JSON.stringify(observedIdentity)).not.toContain(draft.password);
  });
});
