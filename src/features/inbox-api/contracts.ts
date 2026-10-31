import { z } from "zod";
export const notificationSchema = z.object({ id: z.guid(), type: z.string(), title: z.string(), body: z.string().nullable(),
  relatedRecordType: z.string().nullable(), relatedRecordCode: z.string().nullable(), createdAt: z.iso.datetime({ offset: true }), readAt: z.iso.datetime({ offset: true }).nullable(), isMandatory: z.boolean() });
export const inboxSchema = z.object({ items: z.array(notificationSchema), total: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative() });
export const inboxCommandSchema = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("read"), id: z.guid() }), z.strictObject({ action: z.literal("read-all") })]);
