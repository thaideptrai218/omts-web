import type {
  CancelRecoveryResult,
  ResetRecoveredPasswordInput,
  ResetRecoveredPasswordResult,
  StartRecoveryInput,
  StartRecoveryResult,
} from "@/features/account-recovery/domain/account-recovery";

export interface AccountRecoveryRepository {
  cancel(requestId: string): Promise<CancelRecoveryResult>;
  resetPassword(
    input: ResetRecoveredPasswordInput,
  ): Promise<ResetRecoveredPasswordResult>;
  start(input: StartRecoveryInput): Promise<StartRecoveryResult>;
}
