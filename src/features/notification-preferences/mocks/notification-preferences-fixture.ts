import type { NotificationPreferenceSettings } from "../domain/notification-preferences";

// Review fixtures from the ACS-07 categories, not production channel defaults.
export function notificationPreferencesFixture(accountId: string, isManagedStaff = false): NotificationPreferenceSettings {
  const categories = accountId === "account-owner-demo" ? [
    ["orders", "Đơn hàng mới", true], ["work", "Công việc được giao", false],
    ["deadlines", "Nhắc việc đến hạn", false], ["water", "Cảnh báo môi trường nước", true],
    ["provenance", "Mã truy xuất đã gửi", true], ["sales", "Thông tin bán hàng", false],
  ] as const : accountId.startsWith("account-staff-") || isManagedStaff ? [
    ["work", "Công việc được giao", false], ["deadlines", "Nhắc việc đến hạn", false],
    ["water", "Cảnh báo môi trường nước", true],
  ] as const : [];
  return {
    channels: [{ id: "in-app", label: "Trong ứng dụng" }, { id: "email", label: "Email" },
      { id: "push", label: "Push" }, { id: "zalo", label: "Zalo OA" }],
    items: categories.map(([id, label, isMandatory]) => ({ id, label, isMandatory, channels: [
      isMandatory ? { channelId: "in-app", enabled: true, isEditable: false, reason: { code: "MSG23" } }
        : { channelId: "in-app", enabled: true, isEditable: true },
      { channelId: "email", enabled: false, isEditable: true },
      { channelId: "push", enabled: false, isEditable: false, reason: { code: "MSG21", params: { channel_name: "Push" } } },
      { channelId: "zalo", enabled: false, isEditable: false, reason: { code: "MSG21", params: { channel_name: "Zalo OA" } } },
    ] })),
  };
}
