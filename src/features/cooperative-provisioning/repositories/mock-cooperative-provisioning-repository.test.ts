import { describe, expect, it } from "vitest";
import type { ProvisionCooperativeInput } from "@/features/cooperative-provisioning/domain/cooperative-provisioning";
import { createMockCooperativeProvisioningRepository } from "@/features/cooperative-provisioning/repositories/mock-cooperative-provisioning-repository";

const validInput: ProvisionCooperativeInput = {
  cooperativeName: "HTX Trung Nam",
  evidenceImages: [{ type: "image/jpeg" } as File],
  ownerIdentityContact: "Nguyễn Văn An - 0900000000",
  preliminaryCode: "TN-PRELIM",
};

describe("createMockCooperativeProvisioningRepository", () => {
  it("returns the temporary credential once and blocks a second provisioning", async () => {
    const repository = createMockCooperativeProvisioningRepository({
      latencyMs: 0,
    });

    const firstResult = await repository.provision(validInput);
    const secondResult = await repository.provision(validInput);

    expect(firstResult.status).toBe("provisioned");
    expect(secondResult).toEqual({
      message: {
        code: "MSG03",
        params: { object_name: "Chủ hợp tác xã đầu tiên" },
      },
      status: "duplicate-owner",
    });
  });

  it("rejects failed verification before creating access", async () => {
    const repository = createMockCooperativeProvisioningRepository({
      latencyMs: 0,
      verifyEvidence: () => false,
    });

    await expect(repository.provision(validInput)).resolves.toEqual({
      message: { code: "MSG55" },
      status: "verification-failed",
    });
  });

  it("returns session expiry without exposing a credential", async () => {
    const repository = createMockCooperativeProvisioningRepository({
      isSessionActive: () => false,
      latencyMs: 0,
    });

    await expect(repository.provision(validInput)).resolves.toEqual({
      message: { code: "MSG19" },
      status: "session-expired",
    });
  });

  it("revalidates the image evidence at the repository boundary", async () => {
    const repository = createMockCooperativeProvisioningRepository({
      latencyMs: 0,
    });

    await expect(
      repository.provision({
        ...validInput,
        evidenceImages: [{ type: "application/pdf" } as File],
      }),
    ).resolves.toEqual({
      field: "evidenceImages",
      message: { code: "MSG01" },
      status: "invalid-input",
    });
  });
});
