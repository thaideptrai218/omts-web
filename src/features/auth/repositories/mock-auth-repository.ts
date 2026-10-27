import type {
  AuthenticatedSession,
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
import type { MockAccountDirectory } from "@/shared/mocks/mock-account-directory";
import type { ManagedMockLogin } from "@/shared/mocks/managed-mock-auth";
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
  accountDirectory?: MockAccountDirectory;
  resolveManagedAccount?: (identifier: string) => ManagedMockLogin | undefined;
  onManagedContactVerified?: (accountId: string, channel: "email" | "sms", value: string) => void;
  consumeStaffContactProof?: (input: {
    allowedRecipients: readonly VerificationRecipientInput[];
    token: VerificationToken;
  }) => boolean | Readonly<{ channel: "email" | "sms"; recipientValue: string }>;
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
  accountDirectory,
  resolveManagedAccount,
  onManagedContactVerified,
  consumeStaffContactProof = () => false,
  latencyMs = 450,
  verificationService,
}: MockAuthOptions = {}): AuthRepository {
  let currentSession: AuthSession = { status: "anonymous" };
  let activeStaffOnboarding: MockStaffOnboardingState | undefined;
  let activeStaffIdentifier: string | undefined;
  const staffOnboardingStates = createStaffOnboardingStates();
  const credentialVersions = new Map<string, number>();
  const resetAccounts = new Set<string>();

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  function withCurrentIdentity(session: AuthenticatedSession): AuthenticatedSession {
    const identity = accountDirectory?.findAccount(session.account.accountId);
    const managed = resolveManagedAccount?.(session.account.username);
    const account = managed?.account ?? session.account;
    return { ...session, account: { ...account, displayName: managed?.account.displayName ?? identity?.displayName ?? account.displayName } };
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
      if (activeStaffOnboarding.session) accountDirectory?.replacePassword(activeStaffOnboarding.session.account.accountId, input.newPassword);
      if (activeStaffOnboarding.contactVerified && activeStaffIdentifier) {
        currentSession = withCurrentIdentity(activeStaffOnboarding.session ?? createStaffSession(activeStaffIdentifier));
        activeStaffIdentifier = undefined;
        activeStaffOnboarding = undefined;
      }

      return { message: { code: "MSG18" }, status: "changed" };
    },

    async completeStaffOnboarding(
      input: CompleteStaffOnboardingInput,
    ): Promise<CompleteStaffOnboardingResult> {
      await simulateLatency();

      if (!activeStaffOnboarding || !activeStaffIdentifier) {
        return { message: { code: "MSG19" }, status: "rejected" };
      }

      const proof = activeStaffOnboarding.passwordChanged ? consumeStaffContactProof({
          allowedRecipients: activeStaffOnboarding.contacts,
          token: input.verificationToken,
        }) : false;
      if (!proof) {
        return { message: { code: "MSG16" }, status: "rejected" };
      }

      const session = activeStaffOnboarding.session ?? createStaffSession(activeStaffIdentifier);
      const verified = typeof proof === "object" ? proof : undefined;
      const registered = accountDirectory?.register({ ...session.account, password: activeStaffOnboarding.currentPassword,
        identifiers: verified ? [verified.recipientValue] : [],
        contacts: activeStaffOnboarding.contacts.map((contact) => ({ kind: contact.channel === "sms" ? "phone" : "email",
          value: contact.value, isVerified: contact.value === verified?.recipientValue && contact.channel === verified.channel })) });
      if (registered === false) return { message: { code: "MSG16" }, status: "rejected" };
      if (verified) onManagedContactVerified?.(session.account.accountId, verified.channel, verified.recipientValue);
      activeStaffOnboarding.contactVerified = true;
      currentSession = session;
      activeStaffOnboarding = undefined;
      activeStaffIdentifier = undefined;

      return { session, status: "access-granted" };
    },

    async getSession() {
      await simulateLatency();
      if (currentSession.status === "authenticated") {
        const managed = resolveManagedAccount?.(currentSession.account.username);
        if (managed && (managed.locked || managed.requiresContactVerification
          || managed.credentialVersion !== (credentialVersions.get(managed.account.accountId) ?? 0))) {
          currentSession = { status: "anonymous" };
        }
      }
      return currentSession.status === "authenticated" ? withCurrentIdentity(currentSession) : currentSession;
    },

    async login(input: LoginInput): Promise<LoginResult> {
      await simulateLatency();
      activeStaffOnboarding = undefined;
      activeStaffIdentifier = undefined;

      let known = accountDirectory?.findIdentifier(input.identifier);
      const managed = resolveManagedAccount?.(known?.username ?? input.identifier);
      if (managed && managed.credentialVersion !== (credentialVersions.get(managed.account.accountId) ?? 0)) {
        accountDirectory?.replacePassword(managed.account.accountId, demoPassword);
        staffOnboardingStates.delete(managed.account.username);
        resetAccounts.add(managed.account.accountId);
        credentialVersions.set(managed.account.accountId, managed.credentialVersion);
      }
      if (managed && !known) {
        known = accountDirectory?.findIdentifier(managed.account.username);
        if (!known && input.password !== demoPassword) return { message: { code: "MSG12" }, status: "rejected" };
      }
      if (accountDirectory?.isRetiredIdentifier(input.identifier)
        || (known && accountDirectory?.verifyPassword(known.accountId, input.password) === false)) {
        return { message: { code: "MSG12" }, status: "rejected" };
      }
      if (managed && input.identifier !== managed.account.username && input.identifier !== "staff-verified"
        && !managed.verifiedIdentifiers.includes(input.identifier)) return { message: { code: "MSG12" }, status: "rejected" };
      if (managed?.locked) return { message: { code: "MSG13" }, status: "rejected" };
      const identifier = managed?.account.username ?? known?.username ?? input.identifier;
      if (managed && !known) {
        accountDirectory?.register({ ...managed.account, password: demoPassword, identifiers: [
          ...managed.verifiedIdentifiers, ...(input.identifier === "staff-verified" ? ["staff-verified"] : []),
        ], contacts: managed.contacts.map((contact) => ({ kind: contact.channel === "email" ? "email" : "phone",
          value: contact.value, isVerified: managed.verifiedIdentifiers.includes(contact.value) })) });
      }
      if (managed && known) accountDirectory?.updateIdentity({ ...managed.account,
        identifiers: [...managed.verifiedIdentifiers, ...(identifier === "nguyen.an" ? ["staff-verified"] : [])],
        contacts: managed.contacts.map((contact) => ({ kind: contact.channel === "email" ? "email" : "phone", value: contact.value,
          isVerified: managed.verifiedIdentifiers.includes(contact.value) })) });
      const previousGate = staffOnboardingStates.get(identifier);
      if (managed?.requiresContactVerification && previousGate) {
        previousGate.contactVerified = false;
        previousGate.contacts = managed.contacts;
      }
      if (managed && (managed.requiresOnboarding || managed.requiresContactVerification || resetAccounts.has(managed.account.accountId)) && !previousGate) {
        const channels: OnboardingContactChannel[] = managed.contacts.map((contact) => contact.channel === "email" ? "email" : "phone");
        const first = channels[0];
        if (!first) return { message: { code: "MSG13" }, status: "rejected" };
        staffOnboardingStates.set(identifier, { availableContactChannels: [first, ...channels.slice(1)],
          contactVerified: managed.verifiedIdentifiers.length > 0,
          passwordChanged: !managed.requiresOnboarding && !resetAccounts.has(managed.account.accountId),
          currentPassword: input.password, contacts: managed.contacts,
          session: { status: "authenticated", account: managed.account } });
      }
      const staffOnboarding = staffOnboardingStates.get(identifier);

      if (staffOnboarding) {
        if (!known && input.password !== staffOnboarding.currentPassword) {
          return { message: { code: "MSG12" }, status: "rejected" };
        }

        if (staffOnboarding.passwordChanged && staffOnboarding.contactVerified) {
          const session = withCurrentIdentity(staffOnboarding.session ?? createStaffSession(identifier));
          currentSession = session;
          return { session, status: "access-granted" };
        }

        activeStaffOnboarding = staffOnboarding;
        activeStaffIdentifier = identifier;

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
                contactVerified: staffOnboarding.contactVerified,
                passwordChanged: false,
              },
              nextStep: "change-temporary-password",
              status: "staff-onboarding-required",
            };
      }

      if (!known && input.password !== demoPassword) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      const result = managed ? { status: "access-granted" as const, session: { status: "authenticated" as const, account: managed.account } }
        : loginResultsByIdentifier.get(identifier);

      if (!result) {
        return {
          message: { code: "MSG12" },
          status: "rejected",
        };
      }

      if (result.status === "access-granted") {
        const session = withCurrentIdentity(result.session);
        currentSession = session;
        return { ...result, session };
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
