import type {
  LoginInput,
  LoginResult,
  OnboardingContactChannel,
} from "@/features/auth/domain/auth-types";
import type { MockAuthContext } from "@/features/auth/repositories/mock-auth-context";
import {
  createStaffSession,
  demoPassword,
  loginResultsByIdentifier,
} from "@/features/auth/repositories/mock-auth-fixtures";

/**
 * Mock login: resolves demo/managed identifiers, applies credential resets, then
 * either opens a staff onboarding gate or grants access. Logic moved verbatim from
 * mock-auth-repository.ts; former closure variables now live on `ctx.state`.
 */
export function createMockAuthLoginMethod(ctx: MockAuthContext) {
  const {
    accountDirectory,
    credentialVersions,
    resetAccounts,
    resolveManagedAccount,
    simulateLatency,
    staffOnboardingStates,
    state,
    withCurrentIdentity,
  } = ctx;

  return {
    async login(input: LoginInput): Promise<LoginResult> {
      await simulateLatency();
      state.activeStaffOnboarding = undefined;
      state.activeStaffIdentifier = undefined;

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
        identifiers: [...managed.verifiedIdentifiers, ...(identifier === "manager" ? ["staff-verified", "nguyen.an"] : [])],
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
          state.currentSession = session;
          return { session, status: "access-granted" };
        }

        state.activeStaffOnboarding = staffOnboarding;
        state.activeStaffIdentifier = identifier;

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
        state.currentSession = session;
        return { ...result, session };
      }

      return result;
    },
  };
}
