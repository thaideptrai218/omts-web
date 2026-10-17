export type NotificationChannel = Readonly<{
  id: string;
  label: string;
}>;

type LockedNotificationPreferenceReason =
  | Readonly<{
      code: "MSG21";
      params: Readonly<{ channel_name: string }>;
    }>
  | Readonly<{ code: "MSG22" }>
  | Readonly<{ code: "MSG23" }>;

export type NotificationPreferenceCell = Readonly<
  {
    channelId: string;
    enabled: boolean;
  } &
    (
      | Readonly<{
          isEditable: true;
          reason?: never;
        }>
      | Readonly<{
          isEditable: false;
          reason: LockedNotificationPreferenceReason;
        }>
    )
>;

export type NotificationPreferenceItem = Readonly<{
  description?: string;
  id: string;
  isMandatory: boolean;
  label: string;
  channels: readonly NotificationPreferenceCell[];
}>;

export type NotificationPreferenceSettings = Readonly<{
  channels: readonly NotificationChannel[];
  items: readonly NotificationPreferenceItem[];
}>;

export type NotificationPreferenceSelection = Readonly<{
  channelId: string;
  enabled: boolean;
  notificationTypeId: string;
}>;

export type SaveNotificationPreferencesInput = Readonly<{
  selections: readonly NotificationPreferenceSelection[];
}>;

export type LoadNotificationPreferencesResult =
  | Readonly<{
      settings: NotificationPreferenceSettings;
      status: "loaded";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;

export type SaveNotificationPreferencesResult =
  | Readonly<{
      message: Readonly<{
        code: "MSG10";
        params: Readonly<{ object_name: string }>;
      }>;
      settings: NotificationPreferenceSettings;
      status: "saved";
      warning?: Readonly<{ code: "MSG22" }>;
    }>
  | Readonly<{
      message:
        | Readonly<{
            code: "MSG21";
            params: Readonly<{ channel_name: string }>;
          }>
        | Readonly<{ code: "MSG23" }>;
      status: "invalid-preference";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;
