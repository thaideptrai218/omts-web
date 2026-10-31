import { describe, expect, it } from "vitest";
import { maskVerificationRecipient } from "@/features/verification/lib/mask-verification-recipient";

describe("maskVerificationRecipient", () => {
  it("keeps only a short email prefix and the domain", () => {
    expect(maskVerificationRecipient("email", "duythai@example.com")).toBe(
      "du***@example.com",
    );
  });

  it("keeps only the final four phone digits", () => {
    expect(maskVerificationRecipient("sms", "+84 912 345 678")).toBe(
      "••••••5678",
    );
  });
});
