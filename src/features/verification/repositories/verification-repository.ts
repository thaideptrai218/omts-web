import type {
  CancelVerificationResult,
  ResendVerificationResult,
  StartVerificationInput,
  StartVerificationResult,
  VerifyCodeInput,
  VerifyCodeResult,
} from "@/features/verification/domain/verification-types";

export interface VerificationRepository {
  cancel(requestId: string): Promise<CancelVerificationResult>;
  resend(requestId: string): Promise<ResendVerificationResult>;
  start(input: StartVerificationInput): Promise<StartVerificationResult>;
  verify(input: VerifyCodeInput): Promise<VerifyCodeResult>;
}
