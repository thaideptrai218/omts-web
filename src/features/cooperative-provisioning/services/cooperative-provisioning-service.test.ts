import { describe, expect, it, vi } from "vitest";
import type { CooperativeProvisioningRepository } from "@/features/cooperative-provisioning/repositories/cooperative-provisioning-repository";
import { createCooperativeProvisioningService } from "@/features/cooperative-provisioning/services/cooperative-provisioning-service";

describe("createCooperativeProvisioningService", () => {
  it("normalizes text while preserving the selected File objects", async () => {
    const evidenceImage = { type: "image/jpeg" } as File;
    const provision = vi.fn<CooperativeProvisioningRepository["provision"]>(
      async (input) => ({
        credential: {
          accountIdentifier: "owner.demo",
          temporaryPassword: "Omts#24001",
        },
        status: "provisioned",
        summary: {
          cooperativeName: input.cooperativeName,
          preliminaryCode: input.preliminaryCode,
        },
      }),
    );
    const service = createCooperativeProvisioningService({ provision });

    await service.provision({
      cooperativeName: " HTX Trung Nam ",
      evidenceImages: [evidenceImage],
      ownerIdentityContact: " Nguyễn Văn An - 0900000000 ",
      preliminaryCode: " TN-2026 ",
    });

    expect(provision).toHaveBeenCalledWith({
      cooperativeName: "HTX Trung Nam",
      evidenceImages: [evidenceImage],
      ownerIdentityContact: "Nguyễn Văn An - 0900000000",
      preliminaryCode: "TN-2026",
    });
  });
});
