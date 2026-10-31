import { describe, expect, it, vi } from "vitest";
import type { CooperativeProfileRepository } from "@/features/cooperative-profile/repositories/cooperative-profile-repository";
import { createCooperativeProfileService } from "@/features/cooperative-profile/services/cooperative-profile-service";

describe("cooperative profile service", () => {
  it("normalizes form text before crossing the repository boundary", async () => {
    const repository: CooperativeProfileRepository = {
      load: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
      save: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
    };
    const service = createCooperativeProfileService(repository);

    await service.save({
      businessActivities: ["  Nuôi trồng thủy sản  "],
      cooperativeName: "  Hợp tác xã Trung Nam  ",
      email: "   ",
      legalRepresentative: "  Nguyễn Văn An ",
      officeAddress: "  Xã Hải Đông  ",
      phone: "  02031234567  ",
      receivingBankAccount: {
        accountHolder: "  HTX Trung Nam  ",
        accountNumber: "  0123456789  ",
        bankId: "  vcb  ",
      },
      recordVersion: "profile-v1",
      taxId: "  5701234567  ",
      website: " ",
    });

    expect(repository.save).toHaveBeenCalledWith({
      businessActivities: ["Nuôi trồng thủy sản"],
      cooperativeName: "Hợp tác xã Trung Nam",
      email: undefined,
      legalRepresentative: "Nguyễn Văn An",
      officeAddress: "Xã Hải Đông",
      phone: "02031234567",
      receivingBankAccount: {
        accountHolder: "HTX Trung Nam",
        accountNumber: "0123456789",
        bankId: "vcb",
      },
      recordVersion: "profile-v1",
      taxId: "5701234567",
      website: undefined,
    });
  });
});
