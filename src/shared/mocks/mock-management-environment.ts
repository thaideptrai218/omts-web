import {
  mockFeatureCatalog,
  mockFixedRoles,
} from "@/features/role-management/mocks/role-management-fixtures";
import { fixedRoleNames } from "@/features/role-management/domain/fixed-role-policy";
import {
  mockAssignableRoles,
  mockFarmingZones,
  mockManagedAccounts,
} from "@/features/account-management/mocks/account-management-fixtures";
import {
  mockEmployeeAccounts,
  mockEmployeeProfiles,
} from "@/features/employee-management/mocks/employee-management-fixtures";
import { createMockRoleManagementRepository } from "@/features/role-management/repositories/mock-role-management-repository";
import { createMockAccountManagementRepository } from "@/features/account-management/repositories/mock-account-management-repository";
import { createMockEmployeeManagementRepository } from "@/features/employee-management/repositories/mock-employee-management-repository";
import { createMockDashboardRepository } from "@/features/dashboard/repositories/mock-dashboard-repository";

// Shared mock composition, not a backend or a persistence layer. Snapshots are
// cloned by repositories; UI still goes through its existing service contract.
export function createMockManagementEnvironment(latencyMs = 350) {
  // Providers run on load/mutation, after all repositories below are initialized.
  const roles = createMockRoleManagementRepository({
    catalog: mockFeatureCatalog,
    initialRoles: mockFixedRoles,
    fixedNames: fixedRoleNames,
    latencyMs,
    getUsage(roleId) {
      const zoneIds = new Set<string>();
      const impactAccounts = accounts.snapshotAccounts().flatMap((account) => {
        const grants = account.grants.filter(
          (grant) => grant.roleId === roleId && grant.status === "effective",
        );
        if (!grants.length) return [];
        const zones = mockFarmingZones.filter((zone) =>
          grants.some(
            (grant) => grant.zoneId === null || grant.zoneId === zone.id,
          ),
        );
        zones.forEach((zone) => zoneIds.add(zone.id));
        return [
          {
            accountId: account.id,
            displayName: account.displayName,
            username: account.username,
            zoneLabels: zones.map((zone) => zone.label),
          },
        ];
      });
      return {
        activeAccountCount: impactAccounts.length,
        activeZoneCount: zoneIds.size,
        impactAccounts,
      };
    },
  });
  const accounts = createMockAccountManagementRepository({
    featureCatalog: mockFeatureCatalog,
    initialAccounts: mockManagedAccounts,
    roles: mockAssignableRoles,
    zones: mockFarmingZones,
    latencyMs,
    getRoles: () => roles.snapshotRoles(),
  });
  const employees = createMockEmployeeManagementRepository({
    createAccount: (draft, beforePublish) => accounts.createLinkedAccount(draft, beforePublish),
    getAccountCreationOptions: () => ({ roles: roles.snapshotRoles(), zones: mockFarmingZones.map((zone) => ({ ...zone })),
      featureCatalog: mockFeatureCatalog.map((feature) => ({ ...feature, supportedActions: [...feature.supportedActions] })) }),
    zones: mockFarmingZones,
    initialEmployees: mockEmployeeProfiles,
    accounts: mockEmployeeAccounts,
    latencyMs,
    getAccounts: () =>
      accounts
        .snapshotAccounts()
        .filter((account) => account.accountType === "internal"),
  });
  const dashboard = createMockDashboardRepository(latencyMs, () => ({
    accounts: accounts.snapshotAccounts(),
    roles: roles.snapshotRoles(),
    employees: employees.snapshotEmployees(),
    zones: mockFarmingZones,
  }));
  return { accounts, roles, employees, dashboard };
}
