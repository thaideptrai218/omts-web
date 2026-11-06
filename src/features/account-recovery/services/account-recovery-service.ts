import type {
  CancelRecoveryResult,
  ResetRecoveredPasswordInput,
  ResetRecoveredPasswordResult,
  StartRecoveryInput,
  StartRecoveryResult,
} from "@/features/account-recovery/domain/account-recovery";
import type { AccountRecoveryRepository } from "@/features/account-recovery/repositories/account-recovery-repository";

export type AccountRecoveryService = Readonly<{
  cancel(requestId: string): Promise<CancelRecoveryResult>;
  resetPassword(
    input: ResetRecoveredPasswordInput,
  ): Promise<ResetRecoveredPasswordResult>;
  start(input: StartRecoveryInput): Promise<StartRecoveryResult>;
}>;

export function createAccountRecoveryService(
  repository: AccountRecoveryRepository,
): AccountRecoveryService {
  return {
    cancel: (requestId) => repository.cancel(requestId),
    resetPassword: (input) => repository.resetPassword(input),
    start: (input) => repository.start(input),
  };
}
