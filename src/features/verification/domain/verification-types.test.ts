import { describe, expect, it } from "vitest";

import {
  isVerificationCodeComplete,
  normalizeVerificationCode,
  verificationPolicy,
  verificationPurposes,
} from "@/features/verification/domain/verification-types";

describe("verification domain", () => {
  it("keeps the purposes confirmed by the UC08 backend work item", () => {
    expect(verificationPurposes).toEqual([
      "registration",
      "recovery",
      "email-change",
      "phone-change",
      "phone-after-login",
      "password-change-by-email",
    ]);
  });

  it("keeps the settled verification policy in one place", () => {
    expect(verificationPolicy).toEqual({
      codeLength: 6,
      expiresAfterSeconds: 300,
      maxIncorrectAttempts: 5,
      maxSendsPerRequest: 3,
      resendIntervalSeconds: 60,
    });
  });

  it("removes non-digits and limits pasted codes to six digits", () => {
    expect(normalizeVerificationCode(" 12-3a45 678 ")).toBe("123456");
  });

  it.each([
    ["123456", true],
    ["12345", false],
    ["1234567", false],
    ["12345a", false],
  ])("checks whether %s is a complete verification code", (code, expected) => {
    expect(isVerificationCodeComplete(code)).toBe(expected);
  });
});
