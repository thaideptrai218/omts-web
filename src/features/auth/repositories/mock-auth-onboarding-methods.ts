import type {
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
} from "@/features/auth/domain/auth-types";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type { MockAuthContext } from "@/features/auth/repositories/mock-auth-context";
import { createStaffSession } from "@/features/auth/repositories/mock-auth-fixtures";
import { satisfiesPasswordPolicy } from "@/shared/security/password-policy";

/**
 * Staff first-login gate of the mock auth backend: temporary password change,
 * contact verification start and completion. Logic moved verbatim from
 * mock-auth-repository.ts; former closure variables now live on `ctx.state`.
 */
export function createMockAuthOnboardingMethods(ctx: MockAuthContext) {
  const {
    accountDirectory,
    consumeStaffContactProof,
    onManagedContactVerified,
    simulateLatency,
    state,
    verificationService,
    withCurrentIdentity,
  } = ctx;

  return {
    async changeTemporaryPassword(
      input: CurrentPasswordChangeInput,
    ): Promise<CurrentPasswordChangeResult> {
      await simulateLatency();

      if (!state.activeStaffOnboarding) {
        return {
          message: { code: "MSG19" },
          reason: "session-expired",
          status: "rejected",
        };
      }

      if (input.currentPassword !== state.activeStaffOnboarding.currentPassword) {
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

      state.activeStaffOnboarding.currentPassword = input.newPassword;
      state.activeStaffOnboarding.passwordChanged = true;
      if (state.activeStaffOnboarding.session) accountDirectory?.replacePassword(state.activeStaffOnboarding.session.account.accountId, input.newPassword);
      if (state.activeStaffOnboarding.contactVerified && state.activeStaffIdentifier) {
        state.currentSession = withCurrentIdentity(state.activeStaffOnboarding.session ?? createStaffSession(state.activeStaffIdentifier));
        state.activeStaffIdentifier = undefined;
        state.activeStaffOnboarding = undefined;
      }

      return { message: { code: "MSG18" }, status: "changed" };
    },

    async completeStaffOnboarding(
      input: CompleteStaffOnboardingInput,
    ): Promise<CompleteStaffOnboardingResult> {
      await simulateLatency();

      if (!state.activeStaffOnboarding || !state.activeStaffIdentifier) {
        return { message: { code: "MSG19" }, status: "rejected" };
      }

      const proof = state.activeStaffOnboarding.passwordChanged ? consumeStaffContactProof({
          allowedRecipients: state.activeStaffOnboarding.contacts,
          token: input.verificationToken,
        }) : false;
      if (!proof) {
        return { message: { code: "MSG16" }, status: "rejected" };
      }

      const session = state.activeStaffOnboarding.session ?? createStaffSession(state.activeStaffIdentifier);
      const verified = typeof proof === "object" ? proof : undefined;
      const registered = accountDirectory?.register({ ...session.account, password: state.activeStaffOnboarding.currentPassword,
        identifiers: verified ? [verified.recipientValue] : [],
        contacts: state.activeStaffOnboarding.contacts.map((contact) => ({ kind: contact.channel === "sms" ? "phone" : "email",
          value: contact.value, isVerified: contact.value === verified?.recipientValue && contact.channel === verified.channel })) });
      if (registered === false) return { message: { code: "MSG16" }, status: "rejected" };
      if (verified) onManagedContactVerified?.(session.account.accountId, verified.channel, verified.recipientValue);
      state.activeStaffOnboarding.contactVerified = true;
      state.currentSession = session;
      state.activeStaffOnboarding = undefined;
      state.activeStaffIdentifier = undefined;

      return { session, status: "access-granted" };
    },

    async startStaffContactVerification(
      channel: OnboardingContactChannel,
    ): Promise<StartStaffContactVerificationResult> {
      await simulateLatency();

      if (!state.activeStaffOnboarding?.passwordChanged || !verificationService) {
        return { message: { code: "MSG19" }, status: "rejected" };
      }

      const verificationChannel = channel === "phone" ? "sms" : "email";
      const recipient = state.activeStaffOnboarding.contacts.find(
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
