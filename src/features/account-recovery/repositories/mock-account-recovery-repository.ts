import type {
  RecoveryChallenge,
  ResetRecoveredPasswordResult,
  StartRecoveryResult,
} from "@/features/account-recovery/domain/account-recovery";
import type { AccountRecoveryRepository } from "@/features/account-recovery/repositories/account-recovery-repository";
import { verificationPolicy } from "@/features/verification/domain/verification-types";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import { createMockVerificationRequestId } from "@/features/verification/repositories/mock-verification-repository";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";

type MockAccountRecoveryOptions = Readonly<{
  consumeRecoveryProof(token: VerificationToken): boolean;
  latencyMs?: number;
  now?: () => number;
  verificationService: VerificationService;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function maskEmail(identifier: string): string {
  const [localPart, domain] = identifier.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function maskPhone(identifier: string): string {
  const digits = identifier.replace(/\D/g, "");
  return digits.length > 3 ? `••••••${digits.slice(-3)}` : "••••••";
}

function maskIdentifier(channel: "email" | "sms", identifier: string): string {
  return channel === "email" ? maskEmail(identifier) : maskPhone(identifier);
}

export function createMockAccountRecoveryRepository({
  consumeRecoveryProof,
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
      recipient: { channel, maskedValue: maskIdentifier(channel, identifier) },
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

      if (!consumeRecoveryProof(input.verificationToken)) {
        return {
          message: { code: "MSG16" },
          reason: "verification-invalid",
          status: "rejected",
        };
      }

      return { status: "password-reset" };
    },

    async start(input): Promise<StartRecoveryResult> {
      await simulateLatency();
      const verificationResult = await verificationService.start({
        purpose: "recovery",
        recipient: {
          channel: input.channel,
          maskedValue: maskIdentifier(input.channel, input.identifier),
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
