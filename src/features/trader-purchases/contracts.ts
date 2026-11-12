import { z } from "zod";

/**
 * Hợp đồng dữ liệu "Đơn mua của tôi" (SCR-SALE-01) khớp backend MePurchasesController:
 * GET /api/me/purchases, GET /api/me/purchase-requests/{id}, POST /api/me/purchase-requests, POST .../{id}/cancel.
 * Số lượng tính bằng kg (không phải lồng); thương lái không nhận mã yêu cầu, giá hay tên khách khác.
 */
/** `ordered` (3205, "Hoàn thành"): the cooperative made an order (Đặt hàng) from the request. */
export const REQUEST_STATUS_IDS = { awaiting: 3201, accepted: 3202, declined: 3203, cancelled: 3204, ordered: 3205 } as const;
export const MAX_TEXT_LENGTH = 1000;

export const ownerResponseSchema = z.object({
  acceptedKg: z.number().nullable(), pickupDate: z.iso.date().nullable(), payLaterAgreed: z.boolean().nullable(),
  note: z.string().nullable(), respondedAt: z.iso.datetime({ offset: true }),
});
export const traderRequestSchema = z.object({
  id: z.guid(), productId: z.guid(), productName: z.string(), requestedKg: z.number(), pickupDate: z.iso.date(), note: z.string().nullable(),
  sentAt: z.iso.datetime({ offset: true }), statusId: z.number().int(), status: z.string(), fulfilled: z.boolean(), canCancel: z.boolean(),
  response: ownerResponseSchema.nullable(), cancelReason: z.string().nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable(), rowVersion: z.string(),
});
export const myPurchasesSchema = z.object({
  requests: z.array(traderRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export const requestSavedSchema = z.object({ request: traderRequestSchema, message: z.string(), messageCode: z.string() });

/** Tối đa 3 chữ số thập phân và lớn hơn 0, đúng PurchaseRequestRules.IsKg ở backend (cột decimal(18,3)). */
const kgSchema = z.number().positive().max(999_999_999_999_999).refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6);
export const placeRequestSchema = z.strictObject({
  productId: z.guid(), requestedKg: kgSchema, pickupDate: z.iso.date(), note: z.string().max(MAX_TEXT_LENGTH).nullable(),
});
export const cancelRequestSchema = z.strictObject({ reason: z.string().max(MAX_TEXT_LENGTH).nullable(), rowVersion: z.string().min(1) });

export type TraderRequest = z.infer<typeof traderRequestSchema>;
export type MyPurchases = z.infer<typeof myPurchasesSchema>;
