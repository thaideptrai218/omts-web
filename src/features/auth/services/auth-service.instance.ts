import { createMockAuthEnvironment } from "@/features/auth/repositories/mock-auth-environment";
import { createAuthService } from "@/features/auth/services/auth-service";
import { mockAccountDirectory } from "@/shared/mocks/mock-account-directory.instance";
import { managedMockAuth } from "@/shared/mocks/managed-mock-auth.instance";
import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";

const mockAuthEnvironment = createMockAuthEnvironment({ accountDirectory: mockAccountDirectory,
  resolveManagedAccount: managedMockAuth.resolve,
  onManagedContactVerified: mockManagementEnvironment.accounts.recordMockVerifiedContact });

export const authService = createAuthService(
  mockAuthEnvironment.authRepository,
);
export const staffOnboardingVerificationService =
  mockAuthEnvironment.verificationService;
