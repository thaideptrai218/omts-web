import { createMockAccountSecurityRepository } from "@/features/account-security/repositories/mock-account-security-repository";
import {
  createAccountSecurityService,
  type AccountSecurityService,
} from "@/features/account-security/services/account-security-service";

const servicesByAccount = new Map<string, AccountSecurityService>();

export function getAccountSecurityService(accountId: string): AccountSecurityService {
  const existing = servicesByAccount.get(accountId);
  if (existing) return existing;

  const service = createAccountSecurityService(
    createMockAccountSecurityRepository({ initialPassword: "demo123" }),
  );
  servicesByAccount.set(accountId, service);
  return service;
}
