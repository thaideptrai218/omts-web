import type {
  NotificationPreferenceCell,
  NotificationPreferenceSettings,
  SaveNotificationPreferencesResult,
} from "@/features/notification-preferences/domain/notification-preferences";
import type { NotificationPreferencesRepository } from "@/features/notification-preferences/repositories/notification-preferences-repository";

type MockNotificationPreferencesOptions = Readonly<{
  initialSettings: NotificationPreferenceSettings;
  isSessionActive?: () => boolean;
  latencyMs?: number;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cloneCell(cell: NotificationPreferenceCell): NotificationPreferenceCell {
  if (cell.isEditable) return { ...cell };

  return {
    ...cell,
    reason:
      cell.reason.code === "MSG21"
        ? { ...cell.reason, params: { ...cell.reason.params } }
        : { ...cell.reason },
  };
}

function cloneSettings(
  settings: NotificationPreferenceSettings,
): NotificationPreferenceSettings {
  return {
    channels: settings.channels.map((channel) => ({ ...channel })),
    items: settings.items.map((item) => ({
      ...item,
      channels: item.channels.map(cloneCell),
    })),
  };
}

export function createMockNotificationPreferencesRepository({
  initialSettings,
  isSessionActive = () => true,
  latencyMs = 350,
}: MockNotificationPreferencesOptions): NotificationPreferencesRepository {
  let settings = cloneSettings(initialSettings);

  async function simulateLatency() {
    if (latencyMs > 0) await wait(latencyMs);
  }

  return {
    async load() {
      await simulateLatency();
      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      return { settings: cloneSettings(settings), status: "loaded" };
    },

    async save(input): Promise<SaveNotificationPreferencesResult> {
      await simulateLatency();
      if (!isSessionActive()) {
        return { message: { code: "MSG19" }, status: "session-expired" };
      }

      const requestedKeys = new Set<string>();
      let pushWasDenied = false;

      for (const selection of input.selections) {
        const key = `${selection.notificationTypeId}:${selection.channelId}`;
        if (requestedKeys.has(key)) {
          throw new Error(`Duplicate notification preference selection: ${key}`);
        }
        requestedKeys.add(key);

        const item = settings.items.find(
          (candidate) => candidate.id === selection.notificationTypeId,
        );
        const cell = item?.channels.find(
          (candidate) => candidate.channelId === selection.channelId,
        );

        if (!item || !cell) {
          throw new Error(`Unknown notification preference selection: ${key}`);
        }

        if (cell.isEditable || selection.enabled === cell.enabled) continue;

        if (cell.reason.code === "MSG22") {
          pushWasDenied = true;
          continue;
        }

        return {
          message: cell.reason,
          status: "invalid-preference",
        };
      }

      settings = {
        ...settings,
        items: settings.items.map((item) => ({
          ...item,
          channels: item.channels.map((cell) => {
            const selection = input.selections.find(
              (candidate) =>
                candidate.notificationTypeId === item.id &&
                candidate.channelId === cell.channelId,
            );

            if (!selection || !cell.isEditable) return cloneCell(cell);
            return { ...cell, enabled: selection.enabled };
          }),
        })),
      };

      return {
        message: {
          code: "MSG10",
          params: { object_name: "Tùy chọn thông báo" },
        },
        settings: cloneSettings(settings),
        status: "saved",
        warning: pushWasDenied ? { code: "MSG22" } : undefined,
      };
    },
  };
}
