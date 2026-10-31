import { z } from "zod";
export { profileViewSchema, updateProfileRequestSchema } from "@/features/profile/api/profile-contract.schemas";
export type { ProfileViewDto } from "@/features/profile/api/profile-contract.schemas";

export const categoryLabels = { ORDERS: "Đơn hàng", WORK: "Công việc", DEADLINE_REMINDERS: "Nhắc hạn", WATER_ALERTS: "Cảnh báo nước", TRACEABILITY_QR_SENT: "Gửi QR truy xuất", SALES_NOTICES: "Thông báo bán hàng" } as const;
export const channelLabels = { InApp: "Trong ứng dụng", Push: "Push", Email: "Email", Zalo: "Zalo OA" } as const;
const categorySchema = z.enum(["ORDERS", "WORK", "DEADLINE_REMINDERS", "WATER_ALERTS", "TRACEABILITY_QR_SENT", "SALES_NOTICES"]);
const channelSchema = z.enum(["InApp", "Push", "Email", "Zalo"]);
const channelViewSchema = z.object({ channel: channelSchema, enabled: z.boolean(), eligible: z.boolean(), ineligibleReason: z.enum(["EMAIL_NOT_VERIFIED", "ZALO_NOT_CONFIGURED", "NO_PUSH_DEVICE"]).nullable() })
  .refine((value) => value.eligible === (value.ineligibleReason === null))
  .refine((value) => value.ineligibleReason === null || value.channel === "Email" && value.ineligibleReason === "EMAIL_NOT_VERIFIED" || value.channel === "Zalo" && value.ineligibleReason === "ZALO_NOT_CONFIGURED" || value.channel === "Push" && value.ineligibleReason === "NO_PUSH_DEVICE");
export const notificationCatalogSchema = z.array(z.object({ category: categorySchema, mandatory: z.boolean(), channels: z.array(channelViewSchema).length(4)
  .refine((values) => new Set(values.map((value) => value.channel)).size === 4) })
  .refine((value) => !value.mandatory || value.channels.filter((cell) => cell.channel === "InApp" || cell.channel === "Push").every((cell) => cell.enabled)))
  .max(6).refine((values) => new Set(values.map((value) => value.category)).size === values.length);
export const notificationChangeSchema = z.strictObject({ category: categorySchema, channel: z.enum(["InApp", "Email", "Zalo"]), enabled: z.boolean() });
export const notificationSaveSchema = z.strictObject({ items: z.array(notificationChangeSchema).min(1).max(18)
  .refine((values) => new Set(values.map((value) => `${value.category}:${value.channel}`)).size === values.length) });
export type NotificationCatalog = z.infer<typeof notificationCatalogSchema>;
export const notificationSavedSchema = z.object({ categories: notificationCatalogSchema, messageCode: z.literal("MSG-GEN-05"), notice: z.string().min(1).nullable(), noticeCode: z.literal("MSG-ACCOUNT-21").nullable() })
  .refine((value) => (value.notice === null) === (value.noticeCode === null));
export type NotificationChange = z.infer<typeof notificationChangeSchema>;
export type NotificationChannel = z.infer<typeof channelSchema>;
export function notificationCellKey(category: string, channel: string) { return `${category}:${channel}`; }
export function notificationSelections(catalog: NotificationCatalog) {
  return Object.fromEntries(catalog.flatMap((row) => row.channels.map((cell) => [notificationCellKey(row.category, cell.channel), cell.enabled])));
}
export function notificationPatch(catalog: NotificationCatalog, values: Record<string, boolean>): NotificationChange[] {
  return catalog.flatMap((row) => row.channels.flatMap((cell): NotificationChange[] => {
    const key = notificationCellKey(row.category, cell.channel);
    return cell.channel !== "Push" && cell.eligible && !(row.mandatory && cell.channel === "InApp") && values[key] !== cell.enabled
      ? [{ category: row.category, channel: cell.channel, enabled: values[key] }] : [];
  }));
}
export function notificationReason(row: NotificationCatalog[number], cell: NotificationCatalog[number]["channels"][number]) {
  if (cell.channel === "Push") return `Push được quản lý trên ứng dụng di động.${row.mandatory ? " Nhóm này bắt buộc nhận Push." : ""}${!cell.eligible ? " Chưa có thiết bị cho phép nhận Push." : ""}`;
  if (row.mandatory && cell.channel === "InApp") return "Thông báo này bắt buộc nhận trong ứng dụng và không thể tắt.";
  if (!cell.eligible) return cell.ineligibleReason === "EMAIL_NOT_VERIFIED" ? "Email cần được xác minh trước khi bật kênh này." : "Kênh Zalo OA chưa được cấu hình hoặc chưa đủ điều kiện.";
}
