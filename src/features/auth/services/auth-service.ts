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

export type AuthService = Readonly<{
  changeTemporaryPassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
  completeStaffOnboarding(
    input: CompleteStaffOnboardingInput,
  ): Promise<CompleteStaffOnboardingResult>;
  getSession(): Promise<AuthSession>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(): Promise<void>;
  startStaffContactVerification(
    channel: OnboardingContactChannel,
  ): Promise<StartStaffContactVerificationResult>;
}>;

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    changeTemporaryPassword: (input) =>
      repository.changeTemporaryPassword(input),
    completeStaffOnboarding: (input) =>
      repository.completeStaffOnboarding(input),
    getSession: () => repository.getSession(),
    login: (input) =>
      repository.login({
        identifier: input.identifier.trim(),
        password: input.password,
      }),
    logout: () => repository.logout(),
    startStaffContactVerification: (channel) =>
      repository.startStaffContactVerification(channel),
  };
}
