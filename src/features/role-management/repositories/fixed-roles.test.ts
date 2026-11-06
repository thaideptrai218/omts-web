import { describe, expect, it } from "vitest";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import { mockRoles } from "../mocks/role-management-fixtures";

function setup() {
  const environment = createMockManagementEnvironment(0);
  const staff = environment.roles
    .snapshotRoles()
    .find((role) => role.id === "role-staff")!;
  const draft = {
    id: staff.id,
    name: staff.name,
    description: staff.description,
    recordVersion: staff.recordVersion,
    confirmImpact: false,
    permissions: staff.permissions,
  };
  return { ...environment, staff, draft };
}

describe("approved product fixed-role policy", () => {
  it("exposes exactly the three approved roles and gives Staff no business rights initially", () => {
    const h = setup();
    expect(h.roles.snapshotRoles().map((role) => role.name)).toEqual([
      "Quản lý vùng",
      "Kế toán",
      "Nhân viên",
    ]);
    expect(
      h.staff.permissions.every(
        (permission) =>
          permission.actionKeys.length === 0 && permission.dataScopeId === null,
      ),
    ).toBe(true);
  });
  it("rejects create and copy-shaped saves at the running mock adapter", async () => {
    const h = setup();
    expect(
      await h.roles.save({
        ...h.draft,
        id: null,
        name: "Vai trò khác",
        recordVersion: null,
      }),
    ).toMatchObject({ status: "forbidden" });
    expect(
      await h.roles.save({
        ...h.draft,
        id: null,
        name: "Bản sao",
        permissions: mockRoles[0].permissions,
      }),
    ).toMatchObject({ status: "forbidden" });
    expect(h.roles.snapshotRoles()).toHaveLength(3);
  });
  it("rejects renaming a fixed role", async () => {
    const h = setup();
    expect(await h.roles.save({ ...h.draft, name: "Tên khác" })).toMatchObject({
      status: "invalid-input",
      field: "name",
    });
    expect(
      h.roles.snapshotRoles().find((role) => role.id === h.staff.id)?.name,
    ).toBe("Nhân viên");
  });
  it("allows matrix/description edits and shares them with account assignment", async () => {
    const h = setup();
    const permissions = h.roles.snapshotRoles()[0].permissions;
    expect(
      await h.roles.save({
        ...h.draft,
        description: "Theo dõi công việc",
        permissions,
      }),
    ).toMatchObject({ status: "saved" });
    const loaded = await h.accounts.load();
    expect(loaded).toMatchObject({
      status: "loaded",
      workspace: {
        roles: expect.arrayContaining([
          expect.objectContaining({
            id: h.staff.id,
            permissions,
          }),
        ]),
      },
    });
  });
  it("keeps the rule requiring View for any write permission", async () => {
    const h = setup();
    const permissions = h.staff.permissions.map((permission) =>
      permission.featureCode === "EMPLOYEE"
        ? { ...permission, actionKeys: ["CREATE"] }
        : permission,
    );
    expect(await h.roles.save({ ...h.draft, permissions })).toMatchObject({
      status: "invalid-input",
      field: "permission:EMPLOYEE",
    });
  });
  it("blocks discontinuing a role currently held by accounts", async () => {
    const h = setup();
    const manager = h.roles.snapshotRoles()[0];
    expect(
      await h.roles.discontinue({
        id: manager.id,
        recordVersion: manager.recordVersion,
      }),
    ).toMatchObject({ status: "role-in-use" });
  });
  it("restores a role with its matrix, a new version and no resurrection of revoked grants", async () => {
    const h = setup();
    const before = h.accounts.snapshotAccounts();
    const stopped = await h.roles.discontinue({
      id: h.staff.id,
      recordVersion: h.staff.recordVersion,
    });
    if (stopped.status !== "discontinued")
      throw new Error("Expected discontinued");
    expect(
      await h.roles.save({
        ...h.draft,
        recordVersion: stopped.role.recordVersion,
      }),
    ).toMatchObject({ status: "forbidden" });
    const restored = await h.roles.reactivate({
      id: h.staff.id,
      recordVersion: stopped.role.recordVersion,
    });
    expect(restored).toMatchObject({
      status: "reactivated",
      role: {
        name: "Nhân viên",
        permissions: h.staff.permissions,
        status: "in-use",
      },
    });
    if (restored.status !== "reactivated") throw new Error("Expected restored");
    expect(restored.role.recordVersion).not.toBe(stopped.role.recordVersion);
    expect(h.accounts.snapshotAccounts()).toEqual(before);
    expect(
      await h.roles.reactivate({
        id: h.staff.id,
        recordVersion: stopped.role.recordVersion,
      }),
    ).toMatchObject({ status: "conflict" });
  });
});
