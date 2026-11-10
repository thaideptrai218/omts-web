import type {
  AuthenticatedSession,
  AuthSession,
} from "@/features/auth/domain/auth-types";
import {
  createStaffOnboardingStates,
  type MockStaffOnboardingState,
} from "@/features/auth/repositories/mock-auth-staff-onboarding-fixtures";
import type { MockAccountDirectory } from "@/shared/mocks/mock-account-directory";
import type { ManagedMockLogin } from "@/shared/mocks/managed-mock-auth";
import type {
  VerificationRecipientInput,
  VerificationToken,
} from "@/features/verification/domain/verification-types";
import type { VerificationService } from "@/features/verification/services/verification-service";

export type MockAuthOptions = Readonly<{
  getZoneLabel?: (zoneId: string) => string | undefined;
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

/**
 * Mutable session state of one mock auth repository instance. Every method group
 * reads and writes these fields on the same object, exactly like the former
 * closure variables of the single-file repository.
 */
export type MockAuthState = {
  currentSession: AuthSession;
  activeStaffOnboarding: MockStaffOnboardingState | undefined;
  activeStaffIdentifier: string | undefined;
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Builds the shared state, stores and helpers used by every mock auth method group. */
export function createMockAuthContext({
  getZoneLabel,
  accountDirectory,
  resolveManagedAccount,
  onManagedContactVerified,
  consumeStaffContactProof = () => false,
  latencyMs = 450,
  verificationService,
}: MockAuthOptions) {
  const state: MockAuthState = {
    currentSession: { status: "anonymous" },
    activeStaffOnboarding: undefined,
    activeStaffIdentifier: undefined,
  };
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
    const zoneIds = account.access.permissions.flatMap((permission) => permission.scope.kind === "zones" ? permission.scope.zoneIds : []);
    const zoneLabels = [...new Set(zoneIds)].map((id) => getZoneLabel?.(id)).filter(Boolean);
    return { ...session, account: { ...account,
      scopeLabel: !managed && zoneLabels.length ? zoneLabels.join(", ") : account.scopeLabel,
      displayName: managed?.account.displayName ?? identity?.displayName ?? account.displayName } };
  }

  return {
    accountDirectory,
    consumeStaffContactProof,
    credentialVersions,
    onManagedContactVerified,
    resetAccounts,
    resolveManagedAccount,
    simulateLatency,
    staffOnboardingStates,
    state,
    verificationService,
    withCurrentIdentity,
  };
}

export type MockAuthContext = ReturnType<typeof createMockAuthContext>;
