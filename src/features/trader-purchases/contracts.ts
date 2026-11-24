import { z } from "zod";

/**
 * Hợp đồng dữ liệu "Đơn mua của tôi" (SCR-SALE-01) khớp backend MePurchasesController:
 * GET /api/me/purchases, GET /api/me/purchase-requests/{id}, POST /api/me/purchase-requests, POST .../{id}/cancel.
 * Số lượng tính bằng lồng nguyên (backend lưu lồng; kg chỉ là ước tính ở màn hình); thương lái không nhận giá hay tên khách khác.
 */
/** `ordered` (3206, "Hoàn thành"): the cooperative made an order (Đặt hàng) from the request. */
export const REQUEST_STATUS_IDS = { awaiting: 3201, accepted: 3202, declined: 3203, cancelled: 3204, awaitingStaff: 3205, ordered: 3206 } as const;
export const MAX_TEXT_LENGTH = 1000;

export const ownerResponseSchema = z.object({
  acceptedCages: z.number().int().nullable(), pickupDate: z.iso.date().nullable(), payLaterAgreed: z.boolean().nullable(),
  note: z.string().nullable(), respondedAt: z.iso.datetime({ offset: true }),
});
export const traderRequestSchema = z.object({
  id: z.guid(), productId: z.guid(), productName: z.string(), requestedCages: z.number().int(), pickupDate: z.iso.date(), note: z.string().nullable(),
  code: z.string().nullish(), harvestCompletedAt: z.iso.datetime({ offset: true }).nullish(), salesOrderCode: z.string().nullish(),
  sentAt: z.iso.datetime({ offset: true }), statusId: z.number().int(), status: z.string(), fulfilled: z.boolean(), canCancel: z.boolean(),
  response: ownerResponseSchema.nullable(), cancelReason: z.string().nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable(), rowVersion: z.string(),
});
export const myPurchasesSchema = z.object({
  requests: z.array(traderRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export const requestSavedSchema = z.object({ request: traderRequestSchema, message: z.string(), messageCode: z.string() });

/** Số lồng nguyên lớn hơn 0 (int32), đúng PurchaseRequestRules.IsCages ở backend. */
export const cagesSchema = z.number().int().positive().max(2_147_483_647);
export const placeRequestSchema = z.strictObject({
  productId: z.guid(), requestedCages: cagesSchema, pickupDate: z.iso.date(), note: z.string().max(MAX_TEXT_LENGTH).nullable(),
});
export const cancelRequestSchema = z.strictObject({ reason: z.string().max(MAX_TEXT_LENGTH).nullable(), rowVersion: z.string().min(1) });

export type TraderRequest = z.infer<typeof traderRequestSchema>;
export type MyPurchases = z.infer<typeof myPurchasesSchema>;
