import { mockManagedAccounts, mockFarmingZones } from "@/features/account-management/mocks/account-management-fixtures";
import type { DashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";
import { mockEmployeeProfiles } from "@/features/employee-management/mocks/employee-management-fixtures";
import { mockRoles } from "@/features/role-management/mocks/role-management-fixtures";
import type { ManagedAccount, FarmingZoneOption } from "@/features/account-management/domain/account-management";
import type { RoleDetails } from "@/features/role-management/domain/role-management";
import type { EmployeeProfile } from "@/features/employee-management/domain/employee-management";

type SummarySources = Readonly<{ accounts: readonly ManagedAccount[]; roles: readonly RoleDetails[];
  zones: readonly FarmingZoneOption[]; employees: readonly EmployeeProfile[] }>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockDashboardRepository(
  latencyMs = 350,
  getSources: () => SummarySources = () => ({ accounts: mockManagedAccounts, roles: mockRoles,
    zones: mockFarmingZones, employees: mockEmployeeProfiles }),
): DashboardRepository {
  return {
    async load() {
      if (latencyMs > 0) await wait(latencyMs);

      const source = getSources();
      const internalAccounts = source.accounts.filter(
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
          roleInUseCount: source.roles.filter((role) => role.status === "in-use")
            .length,
          zoneInUseCount: source.zones.filter(
            (zone) => zone.status === "in-use",
          ).length,
        },
        workforce: {
          employedCount: source.employees.filter(
            (employee) => employee.status === "employed",
          ).length,
          leftCount: source.employees.filter(
            (employee) => employee.status === "left",
          ).length,
        },
      };
    },
  };
}
