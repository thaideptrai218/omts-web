import type {
  VerificationChallenge,
  VerificationChannel,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { AppMessage } from "@/shared/messages/message-catalog";

export type RecoveryChallenge = Readonly<
  Omit<VerificationChallenge, "purpose"> & { purpose: "recovery" }
>;

export type StartRecoveryInput = Readonly<{
  channel: VerificationChannel;
  identifier: string;
}>;

/**
 * Public outcome for every syntactically valid recovery request.
 * It intentionally carries no account eligibility or delivery status.
 */
export type StartRecoveryResult = Readonly<{
  challenge: RecoveryChallenge;
  message: AppMessage & { code: "MSG15" };
  status: "verification-pending";
}>;

export type CancelRecoveryResult = Readonly<{
  status: "cancelled" | "unavailable";
}>;

export type ResetRecoveredPasswordInput = Readonly<{
  newPassword: string;
  verificationToken: VerificationToken;
}>;

export type ResetRecoveredPasswordResult =
  | Readonly<{ status: "password-reset" }>
  | Readonly<{
      message: AppMessage & { code: "MSG16" };
      reason: "verification-invalid";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG01" };
      reason: "invalid-new-password";
      status: "rejected";
    }>;
