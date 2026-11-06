import type { RegistrationMethod } from "@/features/registration/domain/registration-method";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { AppMessage } from "@/shared/messages/message-catalog";

export type RegistrationDraft = Readonly<{
  identifier: string;
  method: RegistrationMethod;
  password: string;
}>;

export type StartRegistrationResult =
  | Readonly<{
      challenge: VerificationChallenge;
      status: "verification-started";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG14" };
      reason: "identifier-already-registered";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG04" };
      reason: "verification-delivery-failed";
      status: "rejected";
    }>;

export type CompleteRegistrationInput = Readonly<{
  draft: RegistrationDraft;
  verificationToken: VerificationToken;
}>;

export type CompleteRegistrationResult =
  | Readonly<{ status: "registered" }>
  | Readonly<{
      message: AppMessage & { code: "MSG14" };
      reason: "identifier-already-registered";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG16" };
      reason: "verification-invalid";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG01" };
      reason: "invalid-registration-data";
      status: "rejected";
    }>;
