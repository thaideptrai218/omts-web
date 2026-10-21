import type {
  AuthSession,
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  LoginInput,
  LoginResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
} from "@/features/auth/domain/auth-types";
import type { AuthRepository } from "@/features/auth/repositories/auth-repository";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";
import type {
  VerificationRecipientInput,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";
import {
  createMockStaffIdentity,
  mockIdentities,
} from "@/shared/mocks/mock-identities";

type MockAuthOptions = Readonly<{
  consumeStaffContactProof?: (input: {
    allowedRecipients: readonly VerificationRecipientInput[];
    token: VerificationToken;
  }) => boolean;
  latencyMs?: number;
  verificationService?: VerificationService;
}>;

const demoPassword = "demo123";

const demoSession = {
  account: {
    access: {
      permissions: [
        {
          key: "access.accounts.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "access.roles.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "cooperative.profile.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "cooperative.employees.manage",
          scope: { kind: "all-zones" },
        },
        {
          key: "workspace.overview.view",
          scope: { kind: "all-zones" },
        },
      ],
    },
    ...mockIdentities.owner,
  },
  status: "authenticated",
} as const;

const systemAdminSession = {
  account: {
    access: {
      permissions: [
        {
          key: "workspace.overview.view",
          scope: { kind: "global" },
        },
        {
          key: "platform.cooperative.provision",
          scope: { kind: "global" },
        },
      ],
    },
    ...mockIdentities.systemAdmin,
  },
  status: "authenticated",
} as const;

function createStaffSession(username: string) {
  return {
    account: {
      access: {
        permissions: [
          {
            key: "workspace.overview.view",
            scope: { kind: "zones", zoneIds: ["zone-east"] },
          },
        ],
      },
      ...createMockStaffIdentity(username),
    },
    status: "authenticated",
  } as const;
}

const accessGrantedResult = {
  session: demoSession,
  status: "access-granted",
} as const satisfies LoginResult;

type MockStaffOnboardingState = {
  availableContactChannels: readonly [
    OnboardingContactChannel,
    ...OnboardingContactChannel[],
  ];
  contactVerified: boolean;
  contacts: readonly VerificationRecipientInput[];
  currentPassword: string;
  passwordChanged: boolean;
};

function createStaffOnboardingStates() {
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
            value: "0901234567",
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
            maskedValue: "n***@omts.test",
            value: "nhanvien@omts.test",
          },
        ],
        currentPassword: demoPassword,
        passwordChanged: true,
      },
    ],
  ]);
}

const loginResultsByIdentifier: ReadonlyMap<string, LoginResult> =
  new Map<string, LoginResult>([
    ["0900000000", accessGrantedResult],
    [
      "account-blocked",
      { message: { code: "MSG13" }, status: "rejected" },
    ],
    ["owner@omts.test", accessGrantedResult],
    ["owner", accessGrantedResult],
    [
      "sysadmin",
      { session: systemAdminSession, status: "access-granted" },
    ],
    [
      "staff-verified",
      {
        session: createStaffSession("staff-verified"),
        status: "access-granted",
      },
    ],
    [
      "temp-password-expired",
      { message: { code: "MSG68" }, status: "rejected" },
    ],
    [
      "temporarily-locked",
      { message: { code: "MSG69" }, status: "rejected" },
    ],
    [
      "trader-needs-phone",
      {
        message: { code: "MSG67" },
        status: "phone-verification-required",
      },
    ],
  ]);

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockAuthRepository({
  consumeStaffContactProof = () => false,
  latencyMs = 450,
  verificationService,
}: MockAuthOptions = {}): AuthRepository {
  let currentSession: AuthSession = { status: "anonymous" };
  let activeStaffOnboarding: MockStaffOnboardingState | undefined;
  let activeStaffIdentifier: string | undefined;
  const staffOnboardingStates = createStaffOnboardingStates();

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  return {
    async changeTemporaryPassword(
      input: CurrentPasswordChangeInput,
    ): Promise<CurrentPasswordChangeResult> {
      await simulateLatency();

      if (!activeStaffOnboarding) {
        return {
          message: { code: "MSG19" },
          reason: "session-expired",
          status: "rejected",
        };
      }

      if (input.currentPassword !== activeStaffOnboarding.currentPassword) {
        return {
          message: { code: "MSG17" },
          reason: "invalid-current-password",
          status: "rejected",
        };
      }

      if (!satisfiesPasswordPolicy(input.newPassword)) {
        return {
          message: { code: "MSG01" },
          reason: "invalid-new-password",
          status: "rejected",
        };
      }

      activeStaffOnboarding.currentPassword = input.newPassword;
      activeStaffOnboarding.passwordChanged = true;

      return { message: { code: "MSG18" }, status: "changed" };
    },

    async completeStaffOnboarding(
      input: CompleteStaffOnboardingInput,
    ): Promise<CompleteStaffOnboardingResult> {
      await simulateLatency();

      if (!activeStaffOnboarding || !activeStaffIdentifier) {
        return { message: { code: "MSG19" }, status: "rejected" };
      }

      if (
        !activeStaffOnboarding.passwordChanged ||
        !consumeStaffContactProof({
          allowedRecipients: activeStaffOnboarding.contacts,
          token: input.verificationToken,
        })
      ) {
        return { message: { code: "MSG16" }, status: "rejected" };
      }

      const session = createStaffSession(activeStaffIdentifier);
      activeStaffOnboarding.contactVerified = true;
      currentSession = session;
      activeStaffOnboarding = undefined;
      activeStaffIdentifier = undefined;

      return { session, status: "access-granted" };
    },

    async getSession() {
      await simulateLatency();
      return currentSession;
    },

    async login(input: LoginInput): Promise<LoginResult> {
      await simulateLatency();
      activeStaffOnboarding = undefined;
      activeStaffIdentifier = undefined;

      const staffOnboarding = staffOnboardingStates.get(input.identifier);

      if (staffOnboarding) {
        if (input.password !== staffOnboarding.currentPassword) {
          return { message: { code: "MSG12" }, status: "rejected" };
        }

        if (staffOnboarding.passwordChanged && staffOnboarding.contactVerified) {
          const session = createStaffSession(input.identifier);
          currentSession = session;
          return { session, status: "access-granted" };
        }

        activeStaffOnboarding = staffOnboarding;
        activeStaffIdentifier = input.identifier;

        return staffOnboarding.passwordChanged
          ? {
              availableContactChannels:
                staffOnboarding.availableContactChannels,
              checklist: {
                contactVerified: false,
                passwordChanged: true,
              },
              nextStep: "verify-contact",
              status: "staff-onboarding-required",
            }
          : {
              availableContactChannels:
                staffOnboarding.availableContactChannels,
              checklist: {
                contactVerified: false,
                passwordChanged: false,
              },
              nextStep: "change-temporary-password",
              status: "staff-onboarding-required",
            };
      }

      if (input.password !== demoPassword) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      const result = loginResultsByIdentifier.get(input.identifier);

      if (!result) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      if (result.status === "access-granted") {
        currentSession = result.session;
      }

      return result;
    },

    async logout() {
      await simulateLatency();
      activeStaffOnboarding = undefined;
      activeStaffIdentifier = undefined;
      currentSession = { status: "anonymous" };
    },

    async startStaffContactVerification(
      channel: OnboardingContactChannel,
    ): Promise<StartStaffContactVerificationResult> {
      await simulateLatency();

      if (!activeStaffOnboarding?.passwordChanged || !verificationService) {
        return { message: { code: "MSG19" }, status: "rejected" };
      }

      const verificationChannel = channel === "phone" ? "sms" : "email";
      const recipient = activeStaffOnboarding.contacts.find(
        (contact) => contact.channel === verificationChannel,
      );

      if (!recipient) {
        return { message: { code: "MSG04" }, status: "rejected" };
      }

      const result = await verificationService.start({
        purpose: "phone-after-login",
        recipient,
      });

      return result.status === "started"
        ? {
            challenge: {
              ...result.challenge,
              purpose: "phone-after-login",
            },
            status: "started",
          }
        : { message: { code: "MSG04" }, status: "rejected" };
    },
  };
}
