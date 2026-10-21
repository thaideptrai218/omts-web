import { mockManagedAccounts, mockFarmingZones } from "@/features/account-management/mocks/account-management-fixtures";
import type { DashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";
import { mockEmployeeProfiles } from "@/features/employee-management/mocks/employee-management-fixtures";
import { mockRoles } from "@/features/role-management/mocks/role-management-fixtures";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockDashboardRepository(
  latencyMs = 350,
): DashboardRepository {
  return {
    async load() {
      if (latencyMs > 0) await wait(latencyMs);

      const internalAccounts = mockManagedAccounts.filter(
        (account) => account.accountType === "internal",
      );

      return {
        access: {
          activeInternalAccountCount: internalAccounts.filter(
            (account) => account.status === "active",
          ).length,
          lockedInternalAccountCount: internalAccounts.filter(
            (account) => account.status === "locked",
          ).length,
          roleInUseCount: mockRoles.filter((role) => role.status === "in-use")
            .length,
          zoneInUseCount: mockFarmingZones.filter(
            (zone) => zone.status === "in-use",
          ).length,
        },
        workforce: {
          employedCount: mockEmployeeProfiles.filter(
            (employee) => employee.status === "employed",
          ).length,
          leftCount: mockEmployeeProfiles.filter(
            (employee) => employee.status === "left",
          ).length,
        },
      };
    },
  };
}
