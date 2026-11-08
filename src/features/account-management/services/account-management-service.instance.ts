import { AccountManagementService } from "@/features/account-management/services/account-management-service";
import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";

export const accountManagementService = new AccountManagementService(
  mockManagementEnvironment.accounts,
);
