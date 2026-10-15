import type {
  ResendVerificationResult,
  StartVerificationInput,
  StartVerificationResult,
  VerifyCodeInput,
  VerifyCodeResult,
} from "@/features/verification/domain/verification-types";
import type { VerificationRepository } from "@/features/verification/repositories/verification-repository";

export type VerificationService = Readonly<{
  resend(requestId: string): Promise<ResendVerificationResult>;
  start(input: StartVerificationInput): Promise<StartVerificationResult>;
  verify(input: VerifyCodeInput): Promise<VerifyCodeResult>;
}>;

export function createVerificationService(
  repository: VerificationRepository,
): VerificationService {
  return {
    resend: (requestId) => repository.resend(requestId),
    start: (input) => repository.start(input),
    verify: (input) => repository.verify(input),
  };
}
