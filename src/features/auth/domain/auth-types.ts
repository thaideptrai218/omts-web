import type { AppMessage } from "@/shared/messages/message-catalog";
import type { EffectiveAccess } from "@/features/access/domain/access-types";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";

export type AuthAccount = Readonly<{
  access: EffectiveAccess;
  accountId: string;
  displayName: string;
  organizationName: string | null;
  primaryRoleLabel: string;
  scopeLabel: string;
  username: string;
}>;

export type AnonymousSession = Readonly<{
  status: "anonymous";
}>;

export type AuthenticatedSession = Readonly<{
  account: AuthAccount;
  status: "authenticated";
}>;

export type AuthSession = AnonymousSession | AuthenticatedSession;

export type LoginInput = Readonly<{
  identifier: string;
  password: string;
}>;

export type ApplicationAccessGranted = Readonly<{
  session: AuthenticatedSession;
  status: "access-granted";
}>;

export type LoginRejected = Readonly<{
  message: AppMessage;
  status: "rejected";
}>;

export type OnboardingContactChannel = "email" | "phone";

type StaffPasswordChangeRequired = Readonly<{
  availableContactChannels: readonly [
    OnboardingContactChannel,
    ...OnboardingContactChannel[],
  ];
  checklist: Readonly<{
    contactVerified: false;
    passwordChanged: false;
  }>;
  nextStep: "change-temporary-password";
  status: "staff-onboarding-required";
}>;

type StaffContactVerificationRequired = Readonly<{
  availableContactChannels: readonly [
    OnboardingContactChannel,
    ...OnboardingContactChannel[],
  ];
  checklist: Readonly<{
    contactVerified: false;
    passwordChanged: true;
  }>;
  nextStep: "verify-contact";
  status: "staff-onboarding-required";
}>;

export type StaffOnboardingRequired =
  | StaffPasswordChangeRequired
  | StaffContactVerificationRequired;

export type StartStaffContactVerificationResult =
  | Readonly<{
      challenge: VerificationChallenge & {
        purpose: "phone-after-login";
      };
      status: "started";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG04" | "MSG19" };
      status: "rejected";
    }>;

export type CompleteStaffOnboardingResult =
  | ApplicationAccessGranted
  | Readonly<{
      message: AppMessage & { code: "MSG16" | "MSG19" };
      status: "rejected";
    }>;

export type CompleteStaffOnboardingInput = Readonly<{
  verificationToken: VerificationToken;
}>;

export type PhoneVerificationRequired = Readonly<{
  message: Readonly<{ code: "MSG67" }>;
  status: "phone-verification-required";
}>;

export type PostLoginGate =
  | StaffOnboardingRequired
  | PhoneVerificationRequired;

export type LoginResult =
  | ApplicationAccessGranted
  | LoginRejected
  | PostLoginGate;
