import { z } from "zod";
import { notificationSchema } from "@/features/inbox-api/contracts";
import { notificationText } from "@/features/inbox-api/notification-text";

const legacy = notificationSchema;
const v2 = z.object({ id: z.guid(), type: z.string().min(1).max(100), title: z.string().max(4096), body: z.string().max(8192).nullable(),
  messageCode: z.string().max(100).nullable(), messageParams: z.record(z.string(), z.unknown()).nullable(), mandatory: z.boolean(),
  relatedRecordType: z.string().nullable(), relatedRecordId: z.guid().nullable(), relatedRecordCode: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }), readAt: z.iso.datetime({ offset: true }).nullable() });

export function parseInboxItem(raw: unknown) {
  const isV2 = raw !== null && typeof raw === "object" && ("mandatory" in raw || "messageCode" in raw || "relatedRecordId" in raw);
  if (!isV2) { const parsed = legacy.safeParse(raw); return parsed.success ? parsed.data : undefined; }
  const parsed = v2.safeParse(raw);
  if (!parsed.success) return undefined;
  const content = notificationText(parsed.data.messageCode, parsed.data.messageParams, parsed.data);
  if (!content) return undefined;
  const { id, type, relatedRecordType, relatedRecordCode, createdAt, readAt } = parsed.data;
  return { id, type, ...content, relatedRecordType, relatedRecordCode, createdAt, readAt, isMandatory: parsed.data.mandatory, canOpenRecord: parsed.data.relatedRecordId !== null && ["WaterMeasurement", "FarmingZone", "ZoneComplianceDocument", "Account", "CooperativeCertification", "HarvestLot", "PurchaseReceipt", "SupplierPayment"].includes(parsed.data.relatedRecordType ?? "") };
}
export const inboxWirePage = z.object({ items: z.array(z.unknown()).max(20), total: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(), pageSize: z.literal(20).optional() });
export const readAllAck = z.object({ markedRead: z.number().int().nonnegative(), unreadCount: z.number().int().nonnegative() });
