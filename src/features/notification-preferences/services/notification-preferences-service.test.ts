import { describe, expect, it, vi } from "vitest";
import type { NotificationPreferencesRepository } from "@/features/notification-preferences/repositories/notification-preferences-repository";
import { createNotificationPreferencesService } from "@/features/notification-preferences/services/notification-preferences-service";

describe("notification preferences service", () => {
  it("keeps UI access behind the repository contract", async () => {
    const repository: NotificationPreferencesRepository = {
      load: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
      save: vi.fn().mockResolvedValue({
        message: { code: "MSG19" },
        status: "session-expired",
      }),
    };
    const service = createNotificationPreferencesService(repository);
    const input = {
      selections: [
        {
          channelId: "in-app",
          enabled: true,
          notificationTypeId: "water-alert",
        },
      ],
    } as const;

    await service.load();
    await service.save(input);

    expect(repository.load).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith(input);
  });
});
