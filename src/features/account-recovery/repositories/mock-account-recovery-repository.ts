import type {
  RecoveryChallenge,
  ResetRecoveredPasswordResult,
  StartRecoveryResult,
} from "@/features/account-recovery/domain/account-recovery";
import type { AccountRecoveryRepository } from "@/features/account-recovery/repositories/account-recovery-repository";
import { verificationPolicy } from "@/features/verification/domain/verification-types";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import { maskVerificationRecipient } from "@/features/verification/lib/mask-verification-recipient";
import { createMockVerificationRequestId } from "@/features/verification/repositories/mock-verification-repository";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";

type MockAccountRecoveryOptions = Readonly<{
  consumeRecoveryProof(token: VerificationToken): boolean | Readonly<{ identifier: string }>;
  onPasswordReset?: (input: Readonly<{ identifier: string; newPassword: string }>) => void;
  latencyMs?: number;
  now?: () => number;
  verificationService: VerificationService;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockAccountRecoveryRepository({
  consumeRecoveryProof,
  onPasswordReset,
  latencyMs = 350,
  now = Date.now,
  verificationService,
}: MockAccountRecoveryOptions): AccountRecoveryRepository {
  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  function createDummyChallenge(
    channel: "email" | "sms",
    identifier: string,
  ): RecoveryChallenge {
    const currentTime = now();
    return {
      expiresAtMs: currentTime + verificationPolicy.expiresAfterSeconds * 1_000,
      purpose: "recovery",
      recipient: {
        channel,
        maskedValue: maskVerificationRecipient(channel, identifier),
      },
      requestId: createMockVerificationRequestId(),
      resendAvailableAtMs:
        currentTime + verificationPolicy.resendIntervalSeconds * 1_000,
      sendsRemaining: verificationPolicy.maxSendsPerRequest - 1,
    };
  }

  return {
    cancel: (requestId) => verificationService.cancel(requestId),

    async resetPassword(input): Promise<ResetRecoveredPasswordResult> {
      await simulateLatency();

      if (!satisfiesPasswordPolicy(input.newPassword)) {
        return {
          message: { code: "MSG01" },
          reason: "invalid-new-password",
          status: "rejected",
        };
      }

      const proof = consumeRecoveryProof(input.verificationToken);
      if (!proof) {
        return {
          message: { code: "MSG16" },
          reason: "verification-invalid",
          status: "rejected",
        };
      }

      if (typeof proof === "object") onPasswordReset?.({ identifier: proof.identifier, newPassword: input.newPassword });
      return { status: "password-reset" };
    },

    async start(input): Promise<StartRecoveryResult> {
      await simulateLatency();
      const verificationResult = await verificationService.start({
        purpose: "recovery",
        recipient: {
          channel: input.channel,
          maskedValue: maskVerificationRecipient(input.channel, input.identifier),
          value: input.identifier,
        },
      });

      const challenge =
        verificationResult.status === "started"
          ? ({ ...verificationResult.challenge, purpose: "recovery" } as const)
          : createDummyChallenge(input.channel, input.identifier);

      return {
        challenge,
        message: { code: "MSG15" },
        status: "verification-pending",
      };
    },
  };
}
