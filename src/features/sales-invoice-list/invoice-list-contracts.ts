import { z } from "zod";
import { lineEntry, salesInvoice, salesInvoiceSent } from "@/features/sales-invoices/contracts";

/**
 * Hợp đồng dữ liệu Hóa đơn bán (SCR-SALE-05) khớp backend:
 * develop: GET api/sales-invoices (tìm), GET .../export, GET .../{id}/print, GET .../{id}, POST .../{id}/resend.
 * Nhánh feature/OMTS-224-correct-cancel (CHƯA gộp): PUT .../{id}/correction, POST .../{id}/cancel và các trường lastCorrection*, corrections, cancelledAt, cancelReason
 * của chi tiết. Các trường của nhánh chưa gộp đều `optional` để màn vẫn chạy với backend develop hiện tại.
 */
const id = z.guid(), money = z.number(), day = z.iso.date(), at = z.iso.datetime({ offset: true });

export const listRow = z.object({
  id, code: z.string(), invoicedAt: at, invoiceDate: day, zone: z.object({ id, code: z.string(), name: z.string() }),
  customer: z.object({ id, name: z.string(), phoneNumber: z.string().nullable(), code: z.string().nullish() }).nullable(), walkInCustomer: z.boolean(), total: money,
  statusId: z.number().int(), status: z.string(), paymentTerm: z.enum(["PayNow", "PayLater"]), isPaid: z.boolean().nullable(), unpaidAmount: money,
  deliveryStatusId: z.number().int(), deliveryStatus: z.string(), cashAwaitingConfirmation: money.nullable(),
});
export const searchResult = z.object({
  page: z.object({ items: z.array(listRow), page: z.number().int(), pageSize: z.number().int(), total: z.number().int() }),
  completedTotal: money, from: day, to: day, message: z.string().nullable(), messageCode: z.string().nullable(),
});

/** Tên lệnh trong allowedActions. Lệnh lạ (backend thêm sau) bị bỏ qua thay vì làm hỏng cả chi tiết. */
export const knownActions = ["Resend", "CreateReturn", "CancelReturn", "Correct", "Cancel", "Print"] as const;
export type InvoiceAction = (typeof knownActions)[number];

const priceCut = z.object({ amount: money, cutDate: day, reason: z.string() });
export const correctionKind = z.enum(["DataEntryError", "PriceCutAfterClaim"]);
const correction = z.object({ kind: correctionKind, date: day, reason: z.string().nullable(), totalBefore: money, totalAfter: money });

/** Chi tiết hóa đơn: hợp đồng cũ của màn Lập hóa đơn cộng các trường của màn danh sách. `corrections` chỉ có khi backend đã gộp nhánh OMTS-224 (dấu hiệu để bật Sửa / Hủy). */
export const invoiceDetail = salesInvoice.extend({
  priceCuts: z.array(priceCut).default([]),
  debtEffect: z.object({ isPaid: z.boolean().nullable(), covered: money, unpaid: money, countsInCustomerDebt: z.boolean(), customerDebt: money.nullable() }).optional(),
  allowedActions: z.array(z.string()).default([]),
  corrections: z.array(correction).optional(), cancelledAt: at.nullable().optional(), cancelReason: z.string().nullable().optional(),
});
export const invoiceSent = salesInvoiceSent.extend({ invoice: invoiceDetail });
export type InvoiceDetail = z.infer<typeof invoiceDetail>;
export type ListRow = z.infer<typeof listRow>;
export type SearchResult = z.infer<typeof searchResult>;

/** Tra lô thu hoạch theo mã để lọc (GET api/harvest-lots/trace-search): chỉ cần id và mã. */
export const lotSearch = z.object({ lots: z.array(z.object({ id, lotCode: z.string(), zoneCode: z.string() })) });

const reason = z.string().trim().min(1).max(500), rowVersion = z.string().min(1).max(200), wholeMoney = z.number().int().nonnegative().max(9_999_999_999_999);
/** Thân PUT .../correction (nhánh chưa gộp): sửa lỗi nhập liệu (dòng, giảm giá, thu khác) hoặc giảm giá sau khiếu nại; hai loại không dùng chung trường (SALE-07.1). */
export const correctionBody = z.strictObject({
  kind: correctionKind, reason, rowVersion, lines: z.array(lineEntry).min(1).max(100).optional(), notSoldWholeLotIds: z.array(id).max(100).optional(),
  discount: wholeMoney.optional(), otherCharges: wholeMoney.optional(), customerId: id.optional(), priceCutAmount: wholeMoney.positive().optional(), confirmOwedBack: z.boolean().optional(),
}).refine((v) => v.kind === "PriceCutAfterClaim"
  ? v.priceCutAmount !== undefined && v.lines === undefined && v.notSoldWholeLotIds === undefined && v.discount === undefined && v.otherCharges === undefined
  : v.lines !== undefined && v.priceCutAmount === undefined);
/** Thân POST .../cancel (nhánh chưa gộp): lý do, một câu trả lời cho mỗi khoản tiền mặt đang chờ xác nhận, hồ sơ người mua khi là khách lẻ còn khoản đã thu. */
export const cancelBody = z.strictObject({
  reason, rowVersion, cashGivenBack: z.array(z.strictObject({ paymentId: id, givenBack: z.boolean() })).max(50).optional(), customerId: id.optional(), confirmOwedBack: z.boolean().optional(),
});
export type CorrectionBody = z.infer<typeof correctionBody>;
export type CancelBody = z.infer<typeof cancelBody>;
