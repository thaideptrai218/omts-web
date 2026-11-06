import { describe, expect, it, vi } from "vitest";
import type { RegistrationRepository } from "@/features/registration/repositories/registration-repository";
import { createRegistrationService } from "@/features/registration/services/registration-service";

const draft = {
  identifier: "trader@example.com",
  method: "email",
  password: "Matkhau1",
} as const;

describe("registration service", () => {
  it("does not complete an account during the start operation", async () => {
    const repository: RegistrationRepository = {
      complete: vi.fn(),
      start: vi.fn().mockResolvedValue({
        message: { code: "MSG14" },
        reason: "identifier-already-registered",
        status: "rejected",
      }),
    };
    const service = createRegistrationService(repository);

    await service.start(draft);

    expect(repository.start).toHaveBeenCalledWith(draft);
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it("passes the verification token only to completion", async () => {
    const repository: RegistrationRepository = {
      complete: vi.fn().mockResolvedValue({ status: "registered" }),
      start: vi.fn(),
    };
    const service = createRegistrationService(repository);
    const input = {
      draft,
      verificationToken: "short-lived-proof",
    } as const;

    await expect(service.complete(input)).resolves.toEqual({
      status: "registered",
    });
    expect(repository.complete).toHaveBeenCalledWith(input);
    expect(repository.start).not.toHaveBeenCalled();
  });
});
