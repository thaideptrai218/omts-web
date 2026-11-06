import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";
import type { AccountSecurityRepository } from "@/features/account-security/repositories/account-security-repository";

export type AccountSecurityService = Readonly<{
  changeWithCurrentPassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
}>;

export function createAccountSecurityService(
  repository: AccountSecurityRepository,
): AccountSecurityService {
  return {
    changeWithCurrentPassword: (input) =>
      repository.changeWithCurrentPassword(input),
  };
}
