import type { AuthRepository } from "@/features/auth/repositories/auth-repository";
import {
  createMockAuthContext,
  type MockAuthOptions,
} from "@/features/auth/repositories/mock-auth-context";
import { createMockAuthLoginMethod } from "@/features/auth/repositories/mock-auth-login-method";
import { createMockAuthOnboardingMethods } from "@/features/auth/repositories/mock-auth-onboarding-methods";

/**
 * In-memory auth backend for mock mode and tests. Composes the shared session
 * context with the login and staff-onboarding method groups.
 */
export function createMockAuthRepository(options: MockAuthOptions = {}): AuthRepository {
  const ctx = createMockAuthContext(options);
  const { credentialVersions, resolveManagedAccount, simulateLatency, state, withCurrentIdentity } = ctx;

  return {
    ...createMockAuthOnboardingMethods(ctx),
    async getSession() {
      await simulateLatency();
      if (state.currentSession.status === "authenticated") {
        const managed = resolveManagedAccount?.(state.currentSession.account.username);
        if (managed && (managed.locked || managed.requiresContactVerification
          || managed.credentialVersion !== (credentialVersions.get(managed.account.accountId) ?? 0))) {
          state.currentSession = { status: "anonymous" };
        }
      }
      return state.currentSession.status === "authenticated" ? withCurrentIdentity(state.currentSession) : state.currentSession;
    },

    ...createMockAuthLoginMethod(ctx),

    async logout() {
      await simulateLatency();
      state.activeStaffOnboarding = undefined;
      state.activeStaffIdentifier = undefined;
      state.currentSession = { status: "anonymous" };
    },
  };
}
