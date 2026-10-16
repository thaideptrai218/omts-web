export const verificationPurposes = [
  "registration",
  "recovery",
  "email-change",
  "phone-change",
  "phone-after-login",
  "password-change-by-email",
] as const;

export type VerificationPurpose = (typeof verificationPurposes)[number];
export type VerificationChannel = "email" | "sms";

export const verificationPolicy = Object.freeze({
  codeLength: 6,
  expiresAfterSeconds: 5 * 60,
  maxIncorrectAttempts: 5,
  maxSendsPerRequest: 3,
  resendIntervalSeconds: 60,
});

export type MaskedVerificationRecipient = Readonly<{
  channel: VerificationChannel;
  maskedValue: string;
}>;

export type VerificationRecipientInput = Readonly<{
  channel: VerificationChannel;
  maskedValue: string;
  value: string;
}>;

export type VerificationChallenge = Readonly<{
  expiresAtMs: number;
  purpose: VerificationPurpose;
  recipient: MaskedVerificationRecipient;
  requestId: string;
  resendAvailableAtMs: number;
  sendsRemaining: number;
}>;

/**
 * Short-lived proof returned after a successful verification.
 * Callers must pass it to the next use case without storing or logging it.
 */
export type VerificationToken = string;

export type StartVerificationInput = Readonly<{
  purpose: VerificationPurpose;
  recipient: VerificationRecipientInput;
}>;

export type StartVerificationResult =
  | Readonly<{
      challenge: VerificationChallenge;
      status: "started";
    }>
  | Readonly<{
      reason: "delivery-failed";
      status: "rejected";
    }>;

export type ResendVerificationResult =
  | Readonly<{
      challenge: VerificationChallenge;
      status: "resent";
    }>
  | Readonly<{
      reason: "delivery-failed" | "request-not-found" | "send-limit-reached";
      status: "rejected";
    }>
  | Readonly<{
      reason: "too-soon";
      retryAfterSeconds: number;
      status: "rejected";
    }>;

export type VerifyCodeInput = Readonly<{
  code: string;
  requestId: string;
}>;

export type VerifyCodeResult =
  | Readonly<{
      status: "verified";
      token: VerificationToken;
    }>
  | Readonly<{
      attemptsRemaining: number;
      reason: "invalid-or-expired";
      status: "rejected";
    }>
  | Readonly<{
      reason: "attempt-limit-reached" | "request-not-found";
      status: "rejected";
    }>;

export type CancelVerificationResult = Readonly<{
  status: "cancelled" | "unavailable";
}>;

export function normalizeVerificationCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, verificationPolicy.codeLength);
}

export function isVerificationCodeComplete(value: string): boolean {
  return /^\d{6}$/.test(value);
}
