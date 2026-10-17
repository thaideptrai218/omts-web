import { createMockPersonalProfileRepository } from "@/features/profile/repositories/mock-personal-profile-repository";
import { createPersonalProfileService } from "@/features/profile/services/personal-profile-service";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import {
  createMockVerificationRepository,
  type MockVerificationOptions,
  type MockVerifiedProof,
} from "@/features/verification/repositories/mock-verification-repository";
import { createVerificationService } from "@/features/verification/services/verification-service";

type MockPersonalProfileEnvironmentOptions = Readonly<{
  isAmbiguousTraderPhone?: (value: string) => boolean;
  isSessionActive?: () => boolean;
  latencyMs?: number;
  verification?: Omit<MockVerificationOptions, "onVerified">;
}>;

export function createMockPersonalProfileEnvironment({
  isAmbiguousTraderPhone,
  isSessionActive,
  latencyMs,
  verification,
}: MockPersonalProfileEnvironmentOptions = {}) {
  const proofs = new Map<VerificationToken, MockVerifiedProof>();
  const verificationRepository = createMockVerificationRepository({
    ...verification,
    onVerified: (proof) => proofs.set(proof.token, proof),
  });
  const verificationService = createVerificationService(verificationRepository);

  function matchesProof({
    kind,
    token,
    value,
  }: {
    kind: "email" | "phone";
    token: VerificationToken;
    value: string;
  }) {
    const proof = proofs.get(token);
    const expectedPurpose = kind === "email" ? "email-change" : "phone-change";
    const expectedChannel = kind === "email" ? "email" : "sms";

    return Boolean(
      proof &&
        proof.purpose === expectedPurpose &&
        proof.channel === expectedChannel &&
        proof.recipientValue === value,
    );
  }

  const profileRepository = createMockPersonalProfileRepository({
    consumeVerificationProof: ({ token }) => proofs.delete(token),
    hasVerificationProof: matchesProof,
    isAmbiguousTraderPhone,
    isSessionActive,
    latencyMs,
    verificationService,
  });

  return {
    controls: {
      simulateExternalUpdate: (displayName: string) =>
        profileRepository.simulateExternalUpdate(displayName),
    },
    profileService: createPersonalProfileService(profileRepository),
    verificationService,
  } as const;
}
