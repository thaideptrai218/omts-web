import {
  createMockRegistrationRepository,
  type ConsumeRegistrationProofInput,
} from "@/features/registration/repositories/mock-registration-repository";
import { createRegistrationService } from "@/features/registration/services/registration-service";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import {
  createMockVerificationRepository,
  type MockVerificationOptions,
  type MockVerifiedProof,
} from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";

type RegistrationOptions = Readonly<{
  existingIdentifiers?: readonly string[];
  latencyMs?: number;
  shouldConflictOnComplete?: Parameters<
    typeof createMockRegistrationRepository
  >[0]["shouldConflictOnComplete"];
}>;

type MockRegistrationEnvironmentOptions = Readonly<{
  registration?: RegistrationOptions;
  verification?: Omit<MockVerificationOptions, "onVerified">;
}>;

function proofMatches(
  proof: MockVerifiedProof,
  expected: ConsumeRegistrationProofInput,
): boolean {
  return (
    proof.channel === expected.channel &&
    proof.purpose === expected.purpose &&
    proof.recipientValue === expected.identifier &&
    proof.token === expected.token
  );
}

export function createMockRegistrationEnvironment({
  registration,
  verification,
}: MockRegistrationEnvironmentOptions = {}) {
  const proofs = new Map<VerificationToken, MockVerifiedProof>();
  const verificationRepository = createMockVerificationRepository({
    ...verification,
    onVerified: (proof) => proofs.set(proof.token, proof),
  });
  const verificationService = createVerificationService(verificationRepository);
  const registrationRepository = createMockRegistrationRepository({
    ...registration,
    consumeVerificationProof: (input) => {
      const proof = proofs.get(input.token);
      if (!proof || !proofMatches(proof, input)) return false;

      proofs.delete(input.token);
      return true;
    },
    verificationService,
  });

  return {
    registrationService: createRegistrationService(registrationRepository),
    verificationService,
  } as const;
}
