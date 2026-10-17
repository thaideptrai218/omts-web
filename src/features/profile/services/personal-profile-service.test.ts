import { describe, expect, it, vi } from "vitest";
import type { PersonalProfileRepository } from "@/features/profile/repositories/personal-profile-repository";
import { createPersonalProfileService } from "@/features/profile/services/personal-profile-service";

describe("personal profile service", () => {
  it("keeps the component behind the repository contract", async () => {
    const repository: PersonalProfileRepository = {
      load: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
      save: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
      startIdentifierChange: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
    };
    const service = createPersonalProfileService(repository);
    const saveInput = {
      displayName: "Nguyễn An",
      recordVersion: "profile-v1",
    } as const;

    await service.load();
    await service.startIdentifierChange({ kind: "email", value: "a@omts.test" });
    await service.save(saveInput);

    expect(repository.load).toHaveBeenCalledOnce();
    expect(repository.startIdentifierChange).toHaveBeenCalledWith({
      kind: "email",
      value: "a@omts.test",
    });
    expect(repository.save).toHaveBeenCalledWith(saveInput);
  });
});
