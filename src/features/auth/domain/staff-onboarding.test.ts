import { describe, expect, it } from "vitest";
import { completeStaffPasswordChange } from "@/features/auth/domain/staff-onboarding";

describe("completeStaffPasswordChange", () => {
  it("finishes password-only onboarding when the contact is already verified", () => {
    expect(completeStaffPasswordChange({ status: "staff-onboarding-required", nextStep: "change-temporary-password",
      availableContactChannels: ["email"], checklist: { contactVerified: true, passwordChanged: false } }))
      .toEqual({ status: "onboarding-completed" });
  });
  it("opens contact verification and preserves available channels", () => {
    const result = completeStaffPasswordChange({
      availableContactChannels: ["email", "phone"],
      checklist: {
        contactVerified: false,
        passwordChanged: false,
      },
      nextStep: "change-temporary-password",
      status: "staff-onboarding-required",
    });

    expect(result).toEqual({
      availableContactChannels: ["email", "phone"],
      checklist: {
        contactVerified: false,
        passwordChanged: true,
      },
      nextStep: "verify-contact",
      status: "staff-onboarding-required",
    });
  });
});
