import { describe, expect, it, vi } from "vitest";
import type { AccountManagementRepository } from "@/features/account-management/repositories/account-management-repository";
import { AccountManagementService } from "@/features/account-management/services/account-management-service";

function createRepository(): AccountManagementRepository {
  return {
    changeStatus: vi.fn(),
    load: vi.fn(),
    resetPassword: vi.fn(),
    revokeGrant: vi.fn(),
    save: vi.fn().mockResolvedValue({ status: "saved" }),
  };
}

describe("AccountManagementService", () => {
  it("normalizes account text before crossing the repository boundary", async () => {
    const repository = createRepository();
    const service = new AccountManagementService(repository);
    const grant = {
      effectiveFrom: "2026-10-17",
      effectiveTo: "",
      key: "draft-1",
      roleId: "role-zone-manager",
      zoneId: "zone-east",
    };

    await service.save({
      displayName: "  Nguyễn Văn An  ",
      email: "  an@omts.test ",
      id: null,
      newGrants: [grant],
      phone: " 0901234567 ",
      recordVersion: null,
      username: " nguyen.an ",
    });

    expect(repository.save).toHaveBeenCalledWith({
      displayName: "Nguyễn Văn An",
      email: "an@omts.test",
      id: null,
      newGrants: [{ ...grant }],
      phone: "0901234567",
      recordVersion: null,
      username: "nguyen.an",
    });
  });

  it("normalizes reasons for audited operations", async () => {
    const repository = createRepository();
    const service = new AccountManagementService(repository);

    await service.changeStatus({
      accountId: "account-1",
      action: "lock",
      confirmed: true,
      reason: "  Tạm nghỉ  ",
    });
    await service.revokeGrant({
      accountId: "account-1",
      confirmed: true,
      grantId: "grant-1",
      reason: "  Đổi nhiệm vụ  ",
    });

    expect(repository.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Tạm nghỉ" }),
    );
    expect(repository.revokeGrant).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Đổi nhiệm vụ" }),
    );
  });
});
