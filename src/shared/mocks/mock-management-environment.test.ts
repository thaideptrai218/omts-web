import { describe, expect, it } from "vitest";
import { createMockManagementEnvironment } from "./mock-management-environment";
import { mockRoles } from "@/features/role-management/mocks/role-management-fixtures";

async function configureStaffRole(
  environment: ReturnType<typeof createMockManagementEnvironment>,
) {
  const staff = environment.roles
    .snapshotRoles()
    .find((role) => role.id === "role-staff")!;
  const result = await environment.roles.save({
    id: staff.id,
    name: staff.name,
    description: "Đã cấu hình công việc",
    recordVersion: staff.recordVersion,
    confirmImpact: false,
    permissions: mockRoles[1].permissions,
  });
  expect(result.status).toBe("saved");
  if (result.status !== "saved") throw new Error("Expected role");
  return result.role;
}
async function createAccount(
  environment: ReturnType<typeof createMockManagementEnvironment>,
  roleId: string,
) {
  const result = await environment.accounts.save({
    id: null,
    fullName: "Nhân viên kiểm thử",
    email: "review@omts.test",
    phone: "0903333444",
    recordVersion: null,
    deliveryChannel: "email",
    newGrants: [
      {
        key: "draft",
        roleId,
        zoneId: "zone-east",
        effectiveFrom: "2026-01-01",
        effectiveTo: "",
      },
    ],
  });
  if (result.status !== "saved") throw new Error("Expected account");
  return result.account;
}

describe("shared management mock state for the review", () => {
  it("makes updated fixed-role permissions available to account assignment", async () => {
    const h = createMockManagementEnvironment(0);
    const role = await configureStaffRole(h);
    const workspace = await h.accounts.load();
    expect(workspace).toMatchObject({
      status: "loaded",
      workspace: {
        roles: expect.arrayContaining([
          expect.objectContaining({ id: role.id }),
        ]),
      },
    });
    expect((await createAccount(h, role.id)).grants).toEqual(
      expect.arrayContaining([expect.objectContaining({ roleId: role.id })]),
    );
  });
  it("counts live role references and prevents discontinuing a role after assigning it", async () => {
    const h = createMockManagementEnvironment(0);
    const role = await configureStaffRole(h);
    const account = await createAccount(h, role.id);
    expect(
      await h.roles.discontinue({
        id: role.id,
        recordVersion: role.recordVersion,
      }),
    ).toMatchObject({
      status: "role-in-use",
      impactAccounts: [expect.objectContaining({ accountId: account.id })],
    });
  });
  it("offers a new internal account in employee linking and removes it after linking", async () => {
    const h = createMockManagementEnvironment(0);
    const account = await createAccount(h, "role-zone-manager");
    const workspace = await h.employees.load();
    expect(workspace).toMatchObject({
      workspace: {
        availableAccounts: expect.arrayContaining([
          expect.objectContaining({ id: account.id }),
        ]),
      },
    });
    const saved = await h.employees.save({
      id: null,
      recordVersion: null,
      fullName: "Nhân viên kiểm thử",
      phone: account.phone,
      accountId: account.id,
      birthday: "",
      address: "",
      area: "",
      wardCommune: "",
      notes: "",
      otherInformation: "",
      workingZoneIds: [],
      bankAccount: null,
      status: "employed",
    });
    if (saved.status !== "saved") throw new Error("Expected employee");
    const linked = await h.employees.load();
    if (linked.status !== "loaded") throw new Error("Expected workspace");
    expect(
      linked.workspace.availableAccounts.some(
        (candidate) => candidate.id === account.id,
      ),
    ).toBe(false);
    await h.employees.unlinkAccount({
      employeeId: saved.employee.id,
      recordVersion: saved.employee.recordVersion,
    });
    expect(await h.employees.load()).toMatchObject({
      workspace: {
        availableAccounts: expect.arrayContaining([
          expect.objectContaining({ id: account.id }),
        ]),
      },
    });
  });
  it("updates employee/account counts while keeping the fixed role count", async () => {
    const h = createMockManagementEnvironment(0);
    const before = await h.dashboard.load();
    const role = await configureStaffRole(h);
    await createAccount(h, role.id);
    await h.employees.save({
      id: null,
      recordVersion: null,
      fullName: "Người mới",
      phone: "0903333555",
      accountId: null,
      birthday: "",
      address: "",
      area: "",
      wardCommune: "",
      notes: "",
      otherInformation: "",
      workingZoneIds: [],
      bankAccount: null,
      status: "employed",
    });
    const after = await h.dashboard.load();
    expect(after.access.roleInUseCount).toBe(before.access.roleInUseCount);
    expect(after.access.activeInternalAccountCount).toBe(
      before.access.activeInternalAccountCount + 1,
    );
    expect(after.workforce.employedCount).toBe(
      before.workforce.employedCount + 1,
    );
  });
});
