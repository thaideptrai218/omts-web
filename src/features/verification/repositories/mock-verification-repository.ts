import type {
  ResendVerificationResult,
  StartVerificationInput,
  StartVerificationResult,
  VerificationChallenge,
  VerifyCodeInput,
  VerifyCodeResult,
} from "@/features/verification/domain/verification-types";
import { verificationPolicy } from "@/features/verification/domain/verification-types";
import { getRemainingSeconds } from "@/features/verification/lib/countdown";
import type { VerificationRepository } from "@/features/verification/repositories/verification-repository";

type DeliveryOperation = "resend" | "start";

type MockVerificationOptions = Readonly<{
  codes?: readonly [string, string, string];
  latencyMs?: number;
  now?: () => number;
  shouldFailDelivery?: (operation: DeliveryOperation) => boolean;
}>;

type StoredRequest = {
  challenge: VerificationChallenge;
  currentCode: string;
  incorrectAttempts: number;
  sendCount: number;
};

const defaultCodes = ["123456", "654321", "112233"] as const;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockVerificationRepository({
  codes = defaultCodes,
  latencyMs = 350,
  now = Date.now,
  shouldFailDelivery = () => false,
}: MockVerificationOptions = {}): VerificationRepository {
  const requests = new Map<string, StoredRequest>();
  let nextRequestNumber = 1;

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  function createChallenge(
    input: StartVerificationInput,
    requestId: string,
  ): VerificationChallenge {
    const currentTime = now();

    return {
      expiresAtMs: currentTime + verificationPolicy.expiresAfterSeconds * 1_000,
      purpose: input.purpose,
      recipient: {
        channel: input.recipient.channel,
        maskedValue: input.recipient.maskedValue,
      },
      requestId,
      resendAvailableAtMs:
        currentTime + verificationPolicy.resendIntervalSeconds * 1_000,
      sendsRemaining: verificationPolicy.maxSendsPerRequest - 1,
    };
  }

  return {
    async start(input): Promise<StartVerificationResult> {
      await simulateLatency();
      if (shouldFailDelivery("start")) {
        return { reason: "delivery-failed", status: "rejected" };
      }

      const requestId = `mock-verification-${nextRequestNumber++}`;
      const challenge = createChallenge(input, requestId);
      requests.set(requestId, {
        challenge,
        currentCode: codes[0],
        incorrectAttempts: 0,
        sendCount: 1,
      });

      return { challenge, status: "started" };
    },

    async resend(requestId): Promise<ResendVerificationResult> {
      await simulateLatency();
      const request = requests.get(requestId);
      if (!request) return { reason: "request-not-found", status: "rejected" };

      const currentTime = now();
      if (currentTime < request.challenge.resendAvailableAtMs) {
        return {
          reason: "too-soon",
          retryAfterSeconds: getRemainingSeconds(
            request.challenge.resendAvailableAtMs,
            currentTime,
          ),
          status: "rejected",
        };
      }

      if (request.sendCount >= verificationPolicy.maxSendsPerRequest) {
        return { reason: "send-limit-reached", status: "rejected" };
      }

      if (shouldFailDelivery("resend")) {
        return { reason: "delivery-failed", status: "rejected" };
      }

      request.sendCount += 1;
      request.currentCode = codes[request.sendCount - 1];
      request.incorrectAttempts = 0;
      request.challenge = {
        ...request.challenge,
        expiresAtMs: currentTime + verificationPolicy.expiresAfterSeconds * 1_000,
        resendAvailableAtMs:
          currentTime + verificationPolicy.resendIntervalSeconds * 1_000,
        sendsRemaining: verificationPolicy.maxSendsPerRequest - request.sendCount,
      };

      return { challenge: request.challenge, status: "resent" };
    },

    async verify(input: VerifyCodeInput): Promise<VerifyCodeResult> {
      await simulateLatency();
      const request = requests.get(input.requestId);
      if (!request) return { reason: "request-not-found", status: "rejected" };

      if (request.incorrectAttempts >= verificationPolicy.maxIncorrectAttempts) {
        return { reason: "attempt-limit-reached", status: "rejected" };
      }

      if (now() >= request.challenge.expiresAtMs) {
        return {
          attemptsRemaining:
            verificationPolicy.maxIncorrectAttempts - request.incorrectAttempts,
          reason: "invalid-or-expired",
          status: "rejected",
        };
      }

      if (input.code !== request.currentCode) {
        request.incorrectAttempts += 1;
        if (request.incorrectAttempts >= verificationPolicy.maxIncorrectAttempts) {
          return { reason: "attempt-limit-reached", status: "rejected" };
        }

        return {
          attemptsRemaining:
            verificationPolicy.maxIncorrectAttempts - request.incorrectAttempts,
          reason: "invalid-or-expired",
          status: "rejected",
        };
      }

      return {
        status: "verified",
        token: `mock-proof-${input.requestId}`,
      };
    },
  };
}
