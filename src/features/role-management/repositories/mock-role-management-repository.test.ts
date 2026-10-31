import { describe, expect, it } from "vitest";
import { mockFeatureCatalog, mockRoles } from "@/features/role-management/mocks/role-management-fixtures";
import { createMockRoleManagementRepository } from "@/features/role-management/repositories/mock-role-management-repository";

function createRepository() {
  return createMockRoleManagementRepository({
    catalog: mockFeatureCatalog,
    initialRoles: mockRoles,
    latencyMs: 0,
  });
}

describe("mock role management repository", () => {
  it("returns an isolated workspace snapshot", async () => {
    const repository = createRepository();
    const result = await repository.load();

    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") return;
    expect(result.workspace.roles).toHaveLength(3);
    expect(result.workspace.catalog[0]?.code).toBe("EMPLOYEE");
  });

  it("requires impact confirmation before editing a role in use", async () => {
    const repository = createRepository();
    const source = mockRoles[0];
    const firstResult = await repository.save({
      confirmImpact: false,
      description: source.description,
      id: source.id,
      name: source.name,
      permissions: source.permissions,
      recordVersion: source.recordVersion,
    });

    expect(firstResult.status).toBe("impact-confirmation-required");
    if (firstResult.status !== "impact-confirmation-required") return;
    expect(firstResult.impactAccounts).toHaveLength(2);

    const confirmedResult = await repository.save({
      confirmImpact: true,
      description: source.description,
      id: source.id,
      name: source.name,
      permissions: source.permissions,
      recordVersion: source.recordVersion,
    });
    expect(confirmedResult.status).toBe("saved");
  });

  it("rejects a duplicate role name and points to the existing role", async () => {
    const repository = createRepository();
    const result = await repository.save({
      confirmImpact: false,
      description: "Bản sao",
      id: null,
      name: "kế toán",
      permissions: mockRoles[1].permissions,
      recordVersion: null,
    });

    expect(result).toMatchObject({
      existingRoleId: "role-accountant",
      status: "duplicate-name",
    });
  });

  it("revalidates the View implication at the repository boundary", async () => {
    const repository = createRepository();
    const invalidPermissions = mockRoles[1].permissions.map((permission) =>
      permission.featureCode === "RAFT"
        ? { ...permission, actionKeys: ["EDIT"] }
        : permission,
    );
    const result = await repository.save({
      confirmImpact: false,
      description: "Không hợp lệ",
      id: null,
      name: "Vai trò sai",
      permissions: invalidPermissions,
      recordVersion: null,
    });

    expect(result).toMatchObject({
      field: "permission:RAFT",
      status: "invalid-input",
    });
  });

  it("blocks discontinuation while active grants still hold the role", async () => {
    const repository = createRepository();
    const result = await repository.discontinue({
      id: mockRoles[0].id,
      recordVersion: mockRoles[0].recordVersion,
    });

    expect(result.status).toBe("role-in-use");
  });

  it("discontinues an unused role without deleting it", async () => {
    const repository = createRepository();
    const result = await repository.discontinue({
      id: mockRoles[1].id,
      recordVersion: mockRoles[1].recordVersion,
    });

    expect(result.status).toBe("discontinued");
    if (result.status !== "discontinued") return;
    expect(result.role.status).toBe("discontinued");
  });
});
