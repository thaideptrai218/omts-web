import { createMockAccountSecurityRepository } from "@/features/account-security/repositories/mock-account-security-repository";
import { mockAccountDirectory } from "@/shared/mocks/mock-account-directory.instance";
import {
  createAccountSecurityService,
  type AccountSecurityService,
} from "@/features/account-security/services/account-security-service";

const servicesByAccount = new Map<string, AccountSecurityService>();

export function getAccountSecurityService(accountId: string): AccountSecurityService {
  const existing = servicesByAccount.get(accountId);
  if (existing) return existing;

  const service = createAccountSecurityService(
    createMockAccountSecurityRepository({ initialPassword: "demo123", credentials: {
      verify: (password) => mockAccountDirectory.verifyPassword(accountId, password),
      replace: (password) => { mockAccountDirectory.replacePassword(accountId, password); },
    } }),
  );
  servicesByAccount.set(accountId, service);
  return service;
}
