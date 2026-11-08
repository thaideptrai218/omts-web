import type {
  CancelVerificationResult,
  ResendVerificationResult,
  StartVerificationInput,
  StartVerificationResult,
  VerifyCodeInput,
  VerifyCodeResult,
} from "@/features/verification/domain/verification-types";
import type { VerificationRepository } from "@/features/verification/repositories/verification-repository";

export type VerificationService = Readonly<{
  cancel(requestId: string): Promise<CancelVerificationResult>;
  resend(requestId: string): Promise<ResendVerificationResult>;
  start(input: StartVerificationInput): Promise<StartVerificationResult>;
  verify(input: VerifyCodeInput): Promise<VerifyCodeResult>;
}>;

export function createVerificationService(
  repository: VerificationRepository,
): VerificationService {
  return {
    cancel: (requestId) => repository.cancel(requestId),
    resend: (requestId) => repository.resend(requestId),
    start: (input) => repository.start(input),
    verify: (input) => repository.verify(input),
  };
}
