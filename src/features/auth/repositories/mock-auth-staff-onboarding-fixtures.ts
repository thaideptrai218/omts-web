import type {
  AuthenticatedSession,
  OnboardingContactChannel,
} from "@/features/auth/domain/auth-types";
import { demoPassword } from "@/features/auth/repositories/mock-auth-fixtures";
import type { VerificationRecipientInput } from "@/features/verification/domain/verification-types";

/*
 * Seeded first-login / contact-verification gates of the mock staff accounts.
 * Moved verbatim from mock-auth-repository.ts; values must stay identical.
 */

export type MockStaffOnboardingState = {
  session?: AuthenticatedSession;
  availableContactChannels: readonly [
    OnboardingContactChannel,
    ...OnboardingContactChannel[],
  ];
  contactVerified: boolean;
  contacts: readonly VerificationRecipientInput[];
  currentPassword: string;
  passwordChanged: boolean;
};

export function createStaffOnboardingStates() {
  return new Map<string, MockStaffOnboardingState>([
    [
      "staff-first-login",
      {
        availableContactChannels: ["email", "phone"],
        contactVerified: false,
        contacts: [
          {
            channel: "email",
            maskedValue: "n***@omts.test",
            value: "nhanvien@omts.test",
          },
          {
            channel: "sms",
            maskedValue: "••••••4567",
            value: "0903454567",
          },
        ],
        currentPassword: demoPassword,
        passwordChanged: false,
      },
    ],
    [
      "staff-needs-contact-verification",
      {
        availableContactChannels: ["email"],
        contactVerified: false,
        contacts: [
          {
            channel: "email",
            maskedValue: "x***@omts.test",
            value: "xacminh@omts.test",
          },
        ],
        currentPassword: demoPassword,
        passwordChanged: true,
      },
    ],
  ]);
}
