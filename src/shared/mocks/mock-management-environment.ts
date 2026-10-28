import {
  mockFeatureCatalog,
  mockFixedRoles,
} from "@/features/role-management/mocks/role-management-fixtures";
import { fixedRoleNames } from "@/features/role-management/domain/fixed-role-policy";
import {
  mockAssignableRoles,
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
import { createMockFarmingZoneStore } from "@/features/farming-zones/repositories/mock-farming-zone-store";
import { initialFarmingZones } from "@/features/farming-zones/mocks/farming-zone-fixtures";
import { createMockRaftStore } from "@/features/rafts/repositories/mock-raft-store";
import { mockRafts } from "@/features/rafts/mocks/raft-fixtures";
import type { FarmingZoneOption } from "@/features/account-management/domain/account-management";

// Shared mock composition, not a backend or a persistence layer. Snapshots are
// cloned by repositories; UI still goes through its existing service contract.
export function createMockManagementEnvironment(latencyMs = 350) {
  const raftStore = createMockRaftStore({
    initialRafts: mockRafts,
    latencyMs,
    getZones: (): readonly FarmingZoneOption[] => zoneStore.snapshotOptions(),
  });
  const zoneStore = createMockFarmingZoneStore({
    initialZones: initialFarmingZones,
    latencyMs,
    initialActorName: "Lê Minh Hải",
    getInUseRaftCodes: (id): readonly string[] =>
      raftStore
        .snapshotRafts()
        .filter((raft) => raft.zoneId === id && raft.status === "in-use")
        .map((raft) => raft.code),
  });
  const catalog = mockFeatureCatalog.map((feature) =>
    feature.code === "FARMING_ZONE" || feature.code === "RAFT"
      ? {
          ...feature,
          description:
            "Xem trong phạm vi được phân công. Thêm, sửa và đổi trạng thái chỉ dành cho Chủ hợp tác xã.",
          supportedActions: feature.supportedActions.filter(
            (action) => action.key === "VIEW",
          ),
        }
      : feature,
  );
  const initialRoles = mockFixedRoles.map((role) => ({
    ...role,
    permissions: role.permissions.map((permission) =>
      permission.featureCode === "FARMING_ZONE" ||
      permission.featureCode === "RAFT"
        ? {
            ...permission,
            actionKeys: permission.actionKeys.filter((key) => key === "VIEW"),
          }
        : permission,
    ),
  }));
  // Providers run on load/mutation, after all repositories below are initialized.
  const roles = createMockRoleManagementRepository({
    catalog,
    initialRoles,
    fixedNames: fixedRoleNames,
    latencyMs,
    getUsage(roleId) {
      const zoneIds = new Set<string>();
      const impactAccounts = accounts.snapshotAccounts().flatMap((account) => {
        const grants = account.grants.filter(
          (grant) => grant.roleId === roleId && grant.status === "effective",
        );
        if (!grants.length) return [];
        const zones = zoneStore
          .snapshotOptions()
          .filter((zone) =>
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
    featureCatalog: catalog,
    initialAccounts: mockManagedAccounts,
    roles: mockAssignableRoles,
    zones: zoneStore.snapshotOptions(),
    latencyMs,
    getRoles: () => roles.snapshotRoles(),
    getZones: () => zoneStore.snapshotOptions(),
  });
  const employees = createMockEmployeeManagementRepository({
    createAccount: (draft, beforePublish) =>
      accounts.createLinkedAccount(draft, beforePublish),
    getAccountCreationOptions: () => ({
      roles: roles.snapshotRoles(),
      zones: zoneStore.snapshotOptions(),
      featureCatalog: catalog.map((feature) => ({
        ...feature,
        supportedActions: [...feature.supportedActions],
      })),
    }),
    getZones: () => zoneStore.snapshotOptions(),
    zones: zoneStore.snapshotOptions(),
    initialEmployees: mockEmployeeProfiles,
    accounts: mockEmployeeAccounts,
    latencyMs,
    getAccounts: () =>
      accounts
        .snapshotAccounts()
        .filter((account) => account.accountType === "internal"),
  });
  const dashboard = createMockDashboardRepository(latencyMs, () => ({
    rafts: raftStore.snapshotRafts(),
    accounts: accounts.snapshotAccounts(),
    roles: roles.snapshotRoles(),
    employees: employees.snapshotEmployees(),
    zones: zoneStore.snapshotOptions(),
  }));
  return {
    accounts,
    roles,
    employees,
    dashboard,
    zones: zoneStore,
    rafts: raftStore,
  };
}
