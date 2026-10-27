import { createMockAuthRepository } from "@/features/auth/repositories/mock-auth-repository";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import {
  createMockVerificationRepository,
  type MockVerificationOptions,
  type MockVerifiedProof,
} from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";
import type { MockAccountDirectory } from "@/shared/mocks/mock-account-directory";
import type { ManagedMockLogin } from "@/shared/mocks/managed-mock-auth";

type MockAuthEnvironmentOptions = Readonly<{
  accountDirectory?: MockAccountDirectory;
  resolveManagedAccount?: (identifier: string) => ManagedMockLogin | undefined;
  onManagedContactVerified?: (accountId: string, channel: "email" | "sms", value: string) => void;
  authLatencyMs?: number;
  verification?: Omit<MockVerificationOptions, "onVerified">;
}>;

export function createMockAuthEnvironment({
  accountDirectory,
  resolveManagedAccount,
  onManagedContactVerified,
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
    accountDirectory,
    resolveManagedAccount,
    onManagedContactVerified,
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
      return matches && proof ? { channel: proof.channel, recipientValue: proof.recipientValue } : false;
    },
    latencyMs: authLatencyMs,
    verificationService,
  });

  return { authRepository, verificationService } as const;
}
