import type {
  ResendVerificationResult,
  StartVerificationInput,
  StartVerificationResult,
  VerificationChallenge,
  VerificationToken,
  VerifyCodeInput,
  VerifyCodeResult,
} from "@/features/verification/domain/verification-types";
import { verificationPolicy } from "@/features/verification/domain/verification-types";
import { getRemainingSeconds } from "@/features/verification/lib/countdown";
import type { VerificationRepository } from "@/features/verification/repositories/verification-repository";

type DeliveryOperation = "resend" | "start";

export type MockVerifiedProof = Readonly<{
  channel: StartVerificationInput["recipient"]["channel"];
  purpose: StartVerificationInput["purpose"];
  recipientValue: string;
  token: VerificationToken;
}>;

export type MockVerificationOptions = Readonly<{
  codes?: readonly [string, string, string];
  latencyMs?: number;
  now?: () => number;
  onVerified?: (proof: MockVerifiedProof) => void;
  shouldFailDelivery?: (operation: DeliveryOperation) => boolean;
}>;

type StoredRequest = {
  challenge: VerificationChallenge;
  currentCode: string;
  incorrectAttempts: number;
  input: StartVerificationInput;
  publishedToken?: VerificationToken;
  sendCount: number;
};

const defaultCodes = ["123456", "654321", "112233"] as const;
let nextMockRequestNumber = 1;

export function createMockVerificationRequestId(): string {
  return `mock-verification-${nextMockRequestNumber++}`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockVerificationRepository({
  codes = defaultCodes,
  latencyMs = 350,
  now = Date.now,
  onVerified = () => undefined,
  shouldFailDelivery = () => false,
}: MockVerificationOptions = {}): VerificationRepository {
  const requests = new Map<string, StoredRequest>();

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
    async cancel(requestId) {
      await simulateLatency();
      return {
        status: requests.delete(requestId) ? "cancelled" : "unavailable",
      };
    },

    async start(input): Promise<StartVerificationResult> {
      await simulateLatency();
      if (shouldFailDelivery("start")) {
        return { reason: "delivery-failed", status: "rejected" };
      }

      const requestId = createMockVerificationRequestId();
      const challenge = createChallenge(input, requestId);
      requests.set(requestId, {
        challenge,
        currentCode: codes[0],
        incorrectAttempts: 0,
        input,
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

      const token = request.publishedToken ?? `mock-proof-${input.requestId}`;
      if (!request.publishedToken) {
        request.publishedToken = token;
        onVerified({
          channel: request.input.recipient.channel,
          purpose: request.input.purpose,
          recipientValue: request.input.recipient.value,
          token,
        });
      }

      return { status: "verified", token };
    },
  };
}
