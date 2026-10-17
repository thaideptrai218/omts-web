import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockAssignableRoles,
  mockFarmingZones,
  mockManagedAccounts,
} from "@/features/account-management/mocks/account-management-fixtures";
import { createMockAccountManagementRepository } from "@/features/account-management/repositories/mock-account-management-repository";
import { mockFeatureCatalog } from "@/features/role-management/mocks/role-management-fixtures";

function createRepository() {
  return createMockAccountManagementRepository({
    featureCatalog: mockFeatureCatalog,
    initialAccounts: mockManagedAccounts,
    latencyMs: 0,
    roles: mockAssignableRoles,
    zones: mockFarmingZones,
  });
}

describe("mock account management repository", () => {
  beforeEach(() => vi.useRealTimers());

  it("creates an internal account with a 10-character one-time credential", async () => {
    const repository = createRepository();
    const result = await repository.save({
      displayName: "Lê Minh",
      email: "",
      id: null,
      newGrants: [
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "draft-1",
          roleId: "role-zone-manager",
          zoneId: "zone-east",
        },
      ],
      phone: "0911222333",
      recordVersion: null,
      username: "le.minh",
    });

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.credential?.temporaryPassword).toHaveLength(10);
      expect(result.account.phoneVerified).toBe(false);
      expect(result.account.grants).toHaveLength(1);
    }
  });

  it("reports duplicate username and does not create a copy", async () => {
    const repository = createRepository();
    const result = await repository.save({
      displayName: "Bản sao",
      email: "",
      id: null,
      newGrants: [
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "draft-1",
          roleId: "role-zone-manager",
          zoneId: "zone-east",
        },
      ],
      phone: "0911000000",
      recordVersion: null,
      username: "NGUYEN.AN",
    });
    expect(result).toMatchObject({
      existingAccountId: "account-nguyen-an",
      field: "username",
      status: "duplicate",
    });
  });

  it("rejects an ineffective role or zone", async () => {
    const repository = createRepository();
    const result = await repository.save({
      displayName: "Lê Minh",
      email: "",
      id: null,
      newGrants: [
        {
          effectiveFrom: "2026-10-17",
          effectiveTo: "",
          key: "draft-1",
          roleId: "role-observer-old",
          zoneId: "zone-west",
        },
      ],
      phone: "0911222333",
      recordVersion: null,
      username: "le.minh",
    });
    expect(result).toMatchObject({ field: "grants", status: "invalid-input" });
  });

  it("requires reason and confirmation before locking", async () => {
    const repository = createRepository();
    await expect(
      repository.changeStatus({
        accountId: "account-nguyen-an",
        action: "lock",
        confirmed: false,
        reason: "",
      }),
    ).resolves.toMatchObject({ status: "invalid-input" });
    await expect(
      repository.changeStatus({
        accountId: "account-nguyen-an",
        action: "lock",
        confirmed: false,
        reason: "Tạm ngưng công tác",
      }),
    ).resolves.toMatchObject({ status: "confirmation-required" });
    await expect(
      repository.changeStatus({
        accountId: "account-nguyen-an",
        action: "lock",
        confirmed: true,
        reason: "Tạm ngưng công tác",
      }),
    ).resolves.toMatchObject({ account: { status: "locked" }, status: "changed" });
  });

  it("refuses to lock the Cooperative Owner", async () => {
    const repository = createRepository();
    await expect(
      repository.changeStatus({
        accountId: "account-owner-demo",
        action: "lock",
        confirmed: true,
        reason: "Không hợp lệ",
      }),
    ).resolves.toMatchObject({ status: "forbidden" });
  });

  it("revokes a grant with history and never removes it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T08:00:00.000Z"));
    const repository = createRepository();
    const result = await repository.revokeGrant({
      accountId: "account-nguyen-an",
      confirmed: true,
      grantId: "grant-an-east-manager",
      reason: "Chuyển nhiệm vụ",
    });
    expect(result.status).toBe("revoked");
    if (result.status === "revoked") {
      expect(result.account.grants).toHaveLength(2);
      expect(result.account.grants[0]).toMatchObject({
        revocationReason: "Chuyển nhiệm vụ",
        revokedAt: "2026-10-17T08:00:00.000Z",
        status: "revoked",
      });
    }
  });

  it("does not return a temporary password before reset confirmation", async () => {
    const repository = createRepository();
    await expect(
      repository.resetPassword({
        accountId: "account-nguyen-an",
        confirmed: false,
      }),
    ).resolves.toMatchObject({ status: "confirmation-required" });
  });
});
