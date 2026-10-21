import { createMockAuthRepository } from "@/features/auth/repositories/mock-auth-repository";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import {
  createMockVerificationRepository,
  type MockVerificationOptions,
  type MockVerifiedProof,
} from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";

type MockAuthEnvironmentOptions = Readonly<{
  authLatencyMs?: number;
  verification?: Omit<MockVerificationOptions, "onVerified">;
}>;

export function createMockAuthEnvironment({
  authLatencyMs,
  verification,
}: MockAuthEnvironmentOptions = {}) {
  const proofs = new Map<VerificationToken, MockVerifiedProof>();
  const verificationRepository = createMockVerificationRepository({
    ...verification,
    onVerified: (proof) => proofs.set(proof.token, proof),
  });
  const verificationService = createVerificationService(verificationRepository);
  const authRepository = createMockAuthRepository({
    consumeStaffContactProof: ({ allowedRecipients, token }) => {
      const proof = proofs.get(token);
      const matches = Boolean(
        proof &&
          proof.purpose === "phone-after-login" &&
          allowedRecipients.some(
            (recipient) =>
              recipient.channel === proof.channel &&
              recipient.value === proof.recipientValue,
          ),
      );

      if (matches) proofs.delete(token);
      return matches;
    },
    latencyMs: authLatencyMs,
    verificationService,
  });

  return { authRepository, verificationService } as const;
}
