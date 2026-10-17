import { AccountManagementService } from "@/features/account-management/services/account-management-service";
import {
  mockAssignableRoles,
  mockFarmingZones,
  mockManagedAccounts,
} from "@/features/account-management/mocks/account-management-fixtures";
import { createMockAccountManagementRepository } from "@/features/account-management/repositories/mock-account-management-repository";
import { mockFeatureCatalog } from "@/features/role-management/mocks/role-management-fixtures";

export const accountManagementService = new AccountManagementService(
  createMockAccountManagementRepository({
    featureCatalog: mockFeatureCatalog,
    initialAccounts: mockManagedAccounts,
    roles: mockAssignableRoles,
    zones: mockFarmingZones,
  }),
);
