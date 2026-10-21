import { createMockAuthEnvironment } from "@/features/auth/repositories/mock-auth-environment";
import { createAuthService } from "@/features/auth/services/auth-service";

const mockAuthEnvironment = createMockAuthEnvironment();

export const authService = createAuthService(
  mockAuthEnvironment.authRepository,
);
export const staffOnboardingVerificationService =
  mockAuthEnvironment.verificationService;
