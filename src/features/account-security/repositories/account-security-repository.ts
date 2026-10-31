import type {
  CurrentPasswordChangeInput,
  CurrentPasswordChangeResult,
} from "@/features/account-security/domain/change-password";

export interface AccountSecurityRepository {
  changeWithCurrentPassword(
    input: CurrentPasswordChangeInput,
  ): Promise<CurrentPasswordChangeResult>;
}
