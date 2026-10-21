import { describe, expect, it } from "vitest";
import {
  getEffectiveAssignments,
  matchesAccountListFilters,
} from "@/features/account-management/components/account-list-view";
import {
  mockAssignableRoles,
  mockFarmingZones,
  mockManagedAccounts,
} from "@/features/account-management/mocks/account-management-fixtures";

function account(username: string) {
  const result = mockManagedAccounts.find((item) => item.username === username);
  if (!result) throw new Error(`Missing account fixture: ${username}`);
  return result;
}

describe("account list derived assignments", () => {
  it("shows only effective role-zone grants", () => {
    const assignments = getEffectiveAssignments(
      account("nguyen.an"),
      mockAssignableRoles,
      mockFarmingZones,
    );

    expect(assignments).toEqual([
      expect.objectContaining({
        roleName: "Quản lý vùng",
        zoneLabel: "Khu Đông",
      }),
    ]);
  });

  it("treats an all-zone grant as applicable to each zone filter", () => {
    const managedAccount = account("tran.binh");
    const assignments = getEffectiveAssignments(
      managedAccount,
      mockAssignableRoles,
      mockFarmingZones,
    );

    expect(
      matchesAccountListFilters(managedAccount, assignments, {
        query: "",
        roleId: "role-accountant",
        zoneId: "zone-east",
      }),
    ).toBe(true);
    expect(
      matchesAccountListFilters(managedAccount, assignments, {
        query: "",
        roleId: "all",
        zoneId: "all-zones",
      }),
    ).toBe(true);
  });

  it("searches by current role and zone labels", () => {
    const managedAccount = account("nguyen.an");
    const assignments = getEffectiveAssignments(
      managedAccount,
      mockAssignableRoles,
      mockFarmingZones,
    );

    expect(
      matchesAccountListFilters(managedAccount, assignments, {
        query: "quản lý vùng",
        roleId: "all",
        zoneId: "all",
      }),
    ).toBe(true);
    expect(
      matchesAccountListFilters(managedAccount, assignments, {
        query: "",
        roleId: "role-accountant",
        zoneId: "all",
      }),
    ).toBe(false);
  });
});
