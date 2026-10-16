import { createMockAccountRecoveryRepository } from "@/features/account-recovery/repositories/mock-account-recovery-repository";
import { createAccountRecoveryService } from "@/features/account-recovery/services/account-recovery-service";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import {
  createMockVerificationRepository,
  type MockVerificationOptions,
  type MockVerifiedProof,
} from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";

type MockAccountRecoveryEnvironmentOptions = Readonly<{
  latencyMs?: number;
  verification?: Omit<MockVerificationOptions, "onVerified">;
}>;

export function createMockAccountRecoveryEnvironment({
  latencyMs,
  verification,
}: MockAccountRecoveryEnvironmentOptions = {}) {
  const proofs = new Map<VerificationToken, MockVerifiedProof>();
  const verificationRepository = createMockVerificationRepository({
    ...verification,
    onVerified: (proof) => proofs.set(proof.token, proof),
  });
  const verificationService = createVerificationService(verificationRepository);
  const accountRecoveryRepository = createMockAccountRecoveryRepository({
    consumeRecoveryProof: (token) => {
      const proof = proofs.get(token);
      if (!proof || proof.purpose !== "recovery") return false;

      proofs.delete(token);
      return true;
    },
    latencyMs,
    verificationService,
  });

  return {
    accountRecoveryService: createAccountRecoveryService(accountRecoveryRepository),
    verificationService,
  } as const;
}
