import type {
  LoadNotificationPreferencesResult,
  SaveNotificationPreferencesInput,
  SaveNotificationPreferencesResult,
} from "@/features/notification-preferences/domain/notification-preferences";

export type NotificationPreferencesRepository = Readonly<{
  load(): Promise<LoadNotificationPreferencesResult>;
  save(
    input: SaveNotificationPreferencesInput,
  ): Promise<SaveNotificationPreferencesResult>;
}>;
