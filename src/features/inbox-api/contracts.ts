import { z } from "zod";
export const notificationSchema = z.object({ id: z.guid(), type: z.string(), title: z.string(), body: z.string().nullable(),
  relatedRecordType: z.string().nullable(), relatedRecordCode: z.string().nullable(), createdAt: z.iso.datetime({ offset: true }), readAt: z.iso.datetime({ offset: true }).nullable(), isMandatory: z.boolean(), canOpenRecord: z.boolean().optional() });
export const inboxSchema = z.object({ items: z.array(notificationSchema), total: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative() });
export const inboxCommandSchema = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("read"), id: z.guid() }), z.strictObject({ action: z.literal("read-all") })]);

export const openedNotificationSchema = z.object({ notificationId: z.guid(), recordType: z.enum(["WaterMeasurement", "FarmingZone", "ZoneComplianceDocument", "Account"]), recordId: z.guid(), recordCode: z.string().max(500).nullable(), zoneId: z.guid().nullable() })
  .refine((row) => row.recordType !== "WaterMeasurement" || row.zoneId !== null)
  .refine((row) => row.recordType !== "FarmingZone" || row.zoneId === row.recordId);
export type OpenedNotification = z.infer<typeof openedNotificationSchema>;
