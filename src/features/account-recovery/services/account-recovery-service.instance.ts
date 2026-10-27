import { createMockAccountRecoveryEnvironment } from "@/features/account-recovery/repositories/mock-account-recovery-environment";
import { mockAccountDirectory } from "@/shared/mocks/mock-account-directory.instance";

export const mockAccountRecoveryEnvironment =
  createMockAccountRecoveryEnvironment({ onPasswordReset: ({ identifier, newPassword }) => {
    const account = mockAccountDirectory.findIdentifier(identifier);
    if (account) mockAccountDirectory.replacePassword(account.accountId, newPassword);
  } });
