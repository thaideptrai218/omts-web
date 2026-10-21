import type { StaffOnboardingRequired } from "@/features/auth/domain/auth-types";

type StaffPasswordChangeRequired = Extract<
  StaffOnboardingRequired,
  { nextStep: "change-temporary-password" }
>;

export function completeStaffPasswordChange(
  current: StaffPasswordChangeRequired,
): StaffOnboardingRequired {
  return {
    availableContactChannels: current.availableContactChannels,
    checklist: {
      contactVerified: false,
      passwordChanged: true,
    },
    nextStep: "verify-contact",
    status: "staff-onboarding-required",
  };
}
