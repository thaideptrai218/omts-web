import { z } from "zod";
import { originState } from "./contracts";

/**
 * Hợp đồng thu hồi nguồn gốc (TRACE-04), khớp backend OMTS-222:
 * GET /api/harvest-lots/{id}/withdraw-preview, POST /{id}/withdraw, GET /{id}/withdrawal-notices.
 * Lý do thu hồi chỉ dùng nội bộ (BR-TRACE-06): không có trong phản hồi và không hiển thị ở bất kỳ trang công khai nào.
 * Chuỗi thông điệp tiếng Anh của backend không được dùng để hiển thị.
 */
const id = z.guid(), at = z.iso.datetime({ offset: true });

export const withdrawalTrader = z.object({
  customerId: id, customerName: z.string(), phoneNumber: z.string().nullable(), traderAccountId: id.nullable(), invoiceCodes: z.array(z.string()),
});
export const withdrawPreview = z.object({
  lotId: id, lotCode: z.string(), originState, publishedAt: at.nullable(), traders: z.array(withdrawalTrader), walkInInvoiceCodes: z.array(z.string()),
  /** Có giá trị (MSG-TRACE-06) khi không có hóa đơn bán nào đang hiệu lực bán lô này. */
  noticeCode: z.string().nullable(),
});
/** Thông báo gửi cho một khách hàng; deliveryStatusId: 1601 đang gửi, 1602 đã gửi, 1603 chưa gửi được. */
export const withdrawalNotice = z.object({
  customerId: id, customerName: z.string(), phoneNumber: z.string().nullable(), invoiceCodes: z.array(z.string()), channel: z.string(),
  deliveryStatusId: z.number().int(), notifiedInApp: z.boolean(), toCall: z.boolean(),
});
export const withdrawn = z.object({
  lot: z.object({ id, lotCode: z.string(), originState }), notices: z.array(withdrawalNotice), walkInInvoiceCodes: z.array(z.string()), noticeCode: z.string().nullable(),
});
export const withdrawalNotices = z.object({
  lotId: id, lotCode: z.string(), originState, withdrawnAt: at.nullable(), notices: z.array(withdrawalNotice), walkInInvoiceCodes: z.array(z.string()),
});

export const maxReasonLength = 1000;
/** Thân yêu cầu thu hồi: lý do bắt buộc, tối đa 1.000 ký tự (MSG-GEN-01 nếu thiếu). */
export const withdrawBody = z.strictObject({ reason: z.string().trim().min(1).max(maxReasonLength) });

export type WithdrawPreview = z.infer<typeof withdrawPreview>;
export type WithdrawalNotice = z.infer<typeof withdrawalNotice>;
export type Withdrawn = z.infer<typeof withdrawn>;
export type WithdrawalNotices = z.infer<typeof withdrawalNotices>;
