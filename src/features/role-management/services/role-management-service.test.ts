import { describe, expect, it, vi } from "vitest";
import type { RoleManagementRepository } from "@/features/role-management/repositories/role-management-repository";
import { RoleManagementService } from "@/features/role-management/services/role-management-service";

describe("RoleManagementService", () => {
  it("normalizes role text and duplicate action keys before saving", async () => {
    const save = vi.fn().mockResolvedValue({
      message: { code: "MSG01" },
      status: "invalid-input",
    });
    const repository = {
      discontinue: vi.fn(),
      load: vi.fn(),
      save,
    } as unknown as RoleManagementRepository;
    const service = new RoleManagementService(repository);

    await service.save({
      confirmImpact: false,
      description: "  Điều phối khu nuôi  ",
      id: null,
      name: "  Quản lý vùng  ",
      permissions: [
        {
          actionKeys: ["VIEW", "VIEW", "EDIT"],
          dataScopeId: "ZONE",
          featureCode: "RAFT",
        },
      ],
      recordVersion: null,
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Điều phối khu nuôi",
        name: "Quản lý vùng",
        permissions: [
          expect.objectContaining({ actionKeys: ["VIEW", "EDIT"] }),
        ],
      }),
    );
  });
});
