import { describe, expect, it } from "vitest";
import { mockEmployeeProfiles, mockEmployeeAccounts, mockEmployeeZones } from "@/features/employee-management/mocks/employee-management-fixtures";
import { updateEmployeeWorkspace } from "./update-employee-workspace";

describe("employee workspace after mutations", () => {
  const employee = mockEmployeeProfiles[0];
  const workspace = {
    zones: mockEmployeeZones,
    employees: mockEmployeeProfiles,
    availableAccounts: mockEmployeeAccounts.filter((account) =>
      !mockEmployeeProfiles.some((item) => item.account?.id === account.id)),
  };

  it("releases only the previous account and keeps its status and other employees intact", () => {
    const unlinked = { ...employee, account: null, recordVersion: "new-version" };
    const result = updateEmployeeWorkspace(workspace, unlinked);
    expect(result.employees[0]).toEqual(unlinked);
    expect(result.employees[1]).toBe(workspace.employees[1]);
    expect(result.availableAccounts).toContainEqual(employee.account);
    expect(workspace.employees[0].account).toBe(employee.account);
    expect(workspace.availableAccounts).not.toContainEqual(employee.account);
  });

  it("relinking offers the old account and removes the newly linked account without duplicates", () => {
    const replacement = workspace.availableAccounts[0];
    const result = updateEmployeeWorkspace(workspace, { ...employee, account: replacement });
    expect(result.availableAccounts).toContainEqual(employee.account);
    expect(result.availableAccounts).not.toContainEqual(replacement);
    expect(new Set(result.availableAccounts.map((account) => account.id)).size).toBe(result.availableAccounts.length);
  });

  it("reapplying an unlink response does not duplicate accounts or employee rows", () => {
    const unlinked = { ...employee, account: null };
    const first = updateEmployeeWorkspace(workspace, unlinked);
    expect(updateEmployeeWorkspace(first, unlinked)).toEqual(first);
  });
});
