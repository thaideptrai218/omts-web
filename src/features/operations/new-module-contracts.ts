import { z } from "zod";

export const salesProductSchema = z.object({ id: z.guid(), code: z.string(), name: z.string(), description: z.string().nullable(), inUse: z.boolean(), availableForPurchase: z.boolean(), rowVersion: z.string() });
export const requestStatusSchema = z.enum(["AWAITING_RESPONSE", "ACCEPTED", "DECLINED", "CANCELLED"]);
export const purchaseRequestSchema = z.object({ id: z.guid(), code: z.string(), productId: z.guid(), productName: z.string(), quantityUnit: z.literal("Cage"),
  requestedCages: z.number().int().positive(), requestedPickupDate: z.iso.date(), note: z.string().nullable(), status: requestStatusSchema,
  acceptedCages: z.number().int().positive().nullable(), acceptedPickupDate: z.iso.date().nullable(), allowPayLater: z.boolean(), responseNote: z.string().nullable(),
  respondedAt: z.iso.datetime({ offset: true }).nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable(), cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }), customerName: z.string(), rowVersion: z.string() });
export const purchaseRequestPageSchema = z.object({ items: z.array(purchaseRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
export const assignmentSchema = z.object({ id: z.guid(), employeeId: z.guid(), employeeName: z.string(), zoneId: z.guid(), raftId: z.guid().nullable(), raftCode: z.string().nullable(),
  jobTypeId: z.guid().nullable(), job: z.string(), date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable() });
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
