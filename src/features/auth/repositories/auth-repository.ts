import type {
  AuthSession,
  CompleteStaffOnboardingInput,
  CompleteStaffOnboardingResult,
  LoginInput,
  LoginResult,
  OnboardingContactChannel,
  StartStaffContactVerificationResult,
} from "@/features/auth/domain/auth-types";
import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";

export interface AuthRepository {
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
}
