import { z } from "zod";

/**
 * Hợp đồng dữ liệu Khiếu nại chất lượng (CLAIM-01 thương lái báo vấn đề, CLAIM-02 Chủ HTX phản hồi), khớp backend
 * MeQualityClaimsController (api/me/quality-claims) và QualityClaimsController (api/quality-claims).
 * Ảnh: backend trả đường dẫn ký sẵn tới máy chủ backend nên trình duyệt không mở được; Web chỉ dùng thứ tự ảnh và tự dựng đường dẫn qua BFF.
 */
export const CLAIM_STATUS = { awaiting: 3701, rejected: 3702, accepted: 3703 } as const;
export const MAX_DESCRIPTION = 2000, MAX_NOTE = 1000, MAX_PHOTOS = 10, MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png"] as const;
export const claimOffer = z.enum(["ReturnAllGoods", "PriceCutWholeInvoice"]);
export type ClaimOffer = z.infer<typeof claimOffer>;

const when = z.iso.datetime({ offset: true }), day = z.iso.date();
const invoiceRef = z.object({ id: z.guid(), code: z.string() });
const photo = z.object({ sortOrder: z.number().int(), url: z.string() });
const response = z.object({ note: z.string().nullable(), respondedAt: when });
const claimLine = z.object({ productName: z.string(), lotCode: z.string(), kg: z.number(), unitPrice: z.number().nullable(), amount: z.number().nullable() });
const customer = z.object({ id: z.guid(), name: z.string(), phoneNumber: z.string().nullable() });

export const claimRow = z.object({
  id: z.guid(), code: z.string(), sentAt: when, statusId: z.number().int(), status: z.string(), description: z.string(), photoCount: z.number().int().nonnegative(),
  offer: claimOffer.nullable(), invoice: invoiceRef, customer: customer.nullable(),
});
export const claimsPage = z.object({
  items: z.array(claimRow), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative(),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
const invoiceView = z.object({
  id: z.guid(), code: z.string(), invoiceDate: day, zoneId: z.guid(), zoneName: z.string(), statusId: z.number().int(), status: z.string(), subtotal: z.number(), discount: z.number(),
  otherCharges: z.number(), priceCutTotal: z.number(), total: z.number(), lines: z.array(claimLine),
  priceCuts: z.array(z.object({ cutDate: day, amount: z.number(), reason: z.string() })),
});
const sending = z.object({ channel: z.string(), phoneNumber: z.string().nullable(), deliveryStatusId: z.number().int().nullable(), deliveryStatus: z.string().nullable(), deliveryStatusAt: when.nullable() });
/** Khiếu nại dưới góc nhìn nhân viên (Chủ HTX, Quản lý vùng); rowVersion gửi kèm khi phản hồi. */
export const staffClaim = z.object({
  id: z.guid(), code: z.string(), sentAt: when, statusId: z.number().int(), status: z.string(), description: z.string(), photos: z.array(photo), offer: claimOffer.nullable(),
  response: response.nullable(), customer, invoice: invoiceView, sendings: z.array(sending), rowVersion: z.string().min(1),
  message: z.string().nullish(), messageCode: z.string().nullish(),
});
/** Khiếu nại dưới góc nhìn thương lái: không có hồ sơ khách, giá hay lượt gửi tin. */
export const traderClaim = z.object({
  id: z.guid(), code: z.string(), sentAt: when, statusId: z.number().int(), status: z.string(), description: z.string(), photos: z.array(photo), offer: claimOffer.nullable(),
  response: response.nullable(), invoice: invoiceRef, invoiceDate: day, invoiceTotal: z.number(), lines: z.array(claimLine),
});
export const claimSaved = z.object({ claim: traderClaim, message: z.string(), messageCode: z.string() });

/** CLAIM-01: mô tả bắt buộc, tối đa 2000 ký tự sau khi bỏ khoảng trắng đầu cuối (phần ảnh đi riêng). */
export const submitPayload = z.strictObject({ description: z.string().trim().min(1).max(MAX_DESCRIPTION) });
/** CLAIM-02.0: đề nghị bắt buộc; ghi chú không bắt buộc. CLAIM-02.1: lý do từ chối bắt buộc. */
export const acceptBody = z.strictObject({ offer: claimOffer, note: z.string().trim().max(MAX_NOTE).nullable(), rowVersion: z.string().min(1) });
export const rejectBody = z.strictObject({ note: z.string().trim().min(1).max(MAX_NOTE), rowVersion: z.string().min(1) });

export type ClaimRow = z.infer<typeof claimRow>;
export type ClaimsPage = z.infer<typeof claimsPage>;
export type StaffClaim = z.infer<typeof staffClaim>;
export type TraderClaim = z.infer<typeof traderClaim>;
