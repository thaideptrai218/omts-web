import type {
  CompleteRegistrationResult,
  RegistrationDraft,
  StartRegistrationResult,
} from "@/features/registration/domain/registration";
import { getRegistrationVerificationChannel } from "@/features/registration/domain/registration-method";
import type { RegistrationRepository } from "@/features/registration/repositories/registration-repository";
import type { VerificationToken } from "@/features/verification/domain/verification-types";
import { maskVerificationRecipient } from "@/features/verification/lib/mask-verification-recipient";
import type { VerificationService } from "@/features/verification/services/verification-service";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";

export type ConsumeRegistrationProofInput = Readonly<{
  channel: "email" | "sms";
  identifier: string;
  purpose: "registration";
  token: VerificationToken;
}>;

export type ConsumeRegistrationProof = (
  input: ConsumeRegistrationProofInput,
) => boolean;

type RegistrationIdentity = Pick<RegistrationDraft, "identifier" | "method">;

type MockRegistrationOptions = Readonly<{
  consumeVerificationProof: ConsumeRegistrationProof;
  existingIdentifiers?: readonly string[];
  latencyMs?: number;
  shouldConflictOnComplete?: (identity: RegistrationIdentity) => boolean;
  verificationService: VerificationService;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function invalidRegistrationData(): CompleteRegistrationResult {
  return {
    message: { code: "MSG01" },
    reason: "invalid-registration-data",
    status: "rejected",
  };
}

type IdentifierAlreadyRegisteredResult = Extract<
  StartRegistrationResult,
  { reason: "identifier-already-registered" }
>;

function identifierAlreadyRegistered(): IdentifierAlreadyRegisteredResult {
  return {
    message: { code: "MSG14" },
    reason: "identifier-already-registered",
    status: "rejected",
  };
}

export function createMockRegistrationRepository({
  consumeVerificationProof,
  existingIdentifiers = [],
  latencyMs = 350,
  shouldConflictOnComplete = () => false,
  verificationService,
}: MockRegistrationOptions): RegistrationRepository {
  const registeredIdentifiers = new Set(existingIdentifiers);

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  return {
    async start(draft): Promise<StartRegistrationResult> {
      await simulateLatency();
      if (registeredIdentifiers.has(draft.identifier)) {
        return identifierAlreadyRegistered();
      }

      const channel = getRegistrationVerificationChannel(draft.method);
      const verificationResult = await verificationService.start({
        purpose: "registration",
        recipient: {
          channel,
          maskedValue: maskVerificationRecipient(channel, draft.identifier),
          value: draft.identifier,
        },
      });

      if (verificationResult.status === "rejected") {
        return {
          message: { code: "MSG04" },
          reason: "verification-delivery-failed",
          status: "rejected",
        };
      }

      return {
        challenge: verificationResult.challenge,
        status: "verification-started",
      };
    },

    async complete(input): Promise<CompleteRegistrationResult> {
      await simulateLatency();
      if (
        !input.draft.identifier ||
        !satisfiesPasswordPolicy(input.draft.password)
      ) {
        return invalidRegistrationData();
      }

      const hasValidProof = consumeVerificationProof({
        channel: getRegistrationVerificationChannel(input.draft.method),
        identifier: input.draft.identifier,
        purpose: "registration",
        token: input.verificationToken,
      });
      if (!hasValidProof) {
        return {
          message: { code: "MSG16" },
          reason: "verification-invalid",
          status: "rejected",
        };
      }

      if (
        registeredIdentifiers.has(input.draft.identifier) ||
        shouldConflictOnComplete({
          identifier: input.draft.identifier,
          method: input.draft.method,
        })
      ) {
        return identifierAlreadyRegistered();
      }

      registeredIdentifiers.add(input.draft.identifier);
      return { status: "registered" };
    },
  };
}
