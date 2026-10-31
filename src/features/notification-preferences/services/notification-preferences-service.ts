import type { SaveNotificationPreferencesInput } from "@/features/notification-preferences/domain/notification-preferences";
import type { NotificationPreferencesRepository } from "@/features/notification-preferences/repositories/notification-preferences-repository";

export function createNotificationPreferencesService(
  repository: NotificationPreferencesRepository,
) {
  return {
    load: () => repository.load(),
    save: (input: SaveNotificationPreferencesInput) => repository.save(input),
  } as const;
}

export type NotificationPreferencesService = ReturnType<
  typeof createNotificationPreferencesService
>;
