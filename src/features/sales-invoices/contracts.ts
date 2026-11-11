import { z } from "zod";

/**
 * Hợp đồng dữ liệu Hóa đơn bán (SCR-SALE-04 / SALE-05) khớp backend develop:
 * POST /api/sales-invoices, GET /api/sales-invoices/{id}, GET .../publish-check,
 * POST .../finish, POST .../resend, GET .../open-purchase-requests,
 * GET /api/harvest-lots/for-sale. Enum backend là chuỗi (JsonStringEnumConverter).
 */
const id = z.guid(), money = z.number(), at = z.iso.datetime({ offset: true });

export const originState = z.enum(["NotPublished", "Published", "Withdrawn"]);
export const paymentTerm = z.enum(["PayNow", "PayLater"]);
/** Phần tiền không trả bằng tiền mặt: ghi nợ, hoặc trả bằng mã VietQR của hóa đơn (bán chờ chuyển khoản, 202). */
export const restPayment = z.enum(["None", "PayLater", "VietQr"]);

/** Lô thu hoạch có thể chọn bán; kg còn lại chỉ để tham khảo, không chặn bán (BR-HARVEST-02). */
export const lotForSale = z.object({
  id, lotCode: z.string(), raftId: id, raftCode: z.string(), zoneId: id, zoneCode: z.string(), zoneName: z.string(),
  harvestDate: z.iso.date(), remainingKg: money, statusId: z.number().int(), status: z.string(), originState, withdrawnAt: at.nullable(),
  // Chưa có trong backend hiện tại; khi API trả thêm thì màn hình dùng số lồng/ratio của chính lô thay vì trung bình HTX.
  cageCount: z.number().int().nonnegative().nullish(), kgPerCage: z.number().positive().nullish(),
  // Sản phẩm của lô đã tách theo sản phẩm (rỗng với lô cũ); hóa đơn chỉ được bán các sản phẩm này từ lô.
  products: z.array(z.object({ productId: id, productCode: z.string(), productName: z.string(), harvestedKg: z.number(), remainingKg: z.number() })).optional(),
});
export const lotsForSale = z.object({ lots: z.array(lotForSale), message: z.string().nullable(), messageCode: z.string().nullable() });

export const openPurchaseRequest = z.object({
  id, productId: id, productName: z.string(), requestedKg: money, acceptedKg: money, pickupDate: z.iso.date(), payLaterAgreed: z.boolean(), responseNote: z.string().nullable(),
});

const accountRef = z.object({ id, name: z.string() });
const payment = z.object({
  id, code: z.string(), kind: z.enum(["Payment", "PaidBack"]), method: z.enum(["VietQrInvoice", "OtherTransfer", "Cash"]), amount: money,
  paymentDate: z.iso.date(), statusId: z.number().int(), status: z.string(), collectedBy: accountRef.nullable(),
});
const line = z.object({
  id, lineNumber: z.number().int(), productId: id, productName: z.string(), harvestLotId: id, lotCode: z.string(), kg: money, unitPrice: money, listPrice: money,
  priceSource: z.enum(["PriceList", "DecidedByOwner"]), amount: money, soldWholeLot: z.boolean(),
});
const sending = z.object({ channel: z.string(), phoneNumber: z.string().nullable(), deliveryStatusId: z.number().int(), deliveryStatus: z.string(), deliveryStatusAt: at.nullable() });

export const salesInvoice = z.object({
  id, code: z.string(), invoicedAt: at, invoiceDate: z.iso.date(), zone: z.object({ id, code: z.string(), name: z.string() }),
  customer: z.object({ id, name: z.string(), phoneNumber: z.string().nullable(), code: z.string().nullish() }).nullable(), walkInCustomer: z.boolean(),
  purchaseRequestId: id.nullable(), takesRequestInFull: z.boolean(), lines: z.array(line), totalKg: money, subtotal: money, discount: money, discountDecidedByOwner: z.boolean(),
  otherCharges: money, priceCutTotal: money, total: money, paymentTerm, statusId: z.number().int(), status: z.string(), payments: z.array(payment), createdBy: accountRef,
  qrToken: z.string().nullable(), qrUrl: z.string().nullable(), qrDecidedAt: at.nullable(), deliveryStatusId: z.number().int(), deliveryStatus: z.string(), sendings: z.array(sending), rowVersion: z.string(),
});
export const salesInvoiceSaved = z.object({ invoice: salesInvoice, change: money, subtractedFromDebt: money, message: z.string(), messageCode: z.string() });

const invoiceLotOrigin = z.object({
  harvestLotId: id, lotCode: z.string(), originState, missing: z.array(z.unknown()), message: z.string().nullable(), messageCode: z.string().nullable(),
});
export const publishCheck = z.object({ invoiceId: id, invoiceCode: z.string(), lots: z.array(invoiceLotOrigin), getsQrCode: z.boolean() });
export const salesInvoiceSent = z.object({
  invoice: salesInvoice, deliveryStatusId: z.number().int(), deliveryStatus: z.string(), qrUrl: z.string().nullable(), lots: z.array(invoiceLotOrigin), message: z.string().nullable(), messageCode: z.string().nullable(),
});

/** Một dòng do Quản lý vùng nhập: đơn giá bỏ trống thì backend dùng giá niêm yết. */
export const lineEntry = z.strictObject({
  productId: id, harvestLotId: id, kg: z.number().positive().max(1_000_000),
  unitPrice: z.number().int().positive().nullable().optional(), priceDecidedByOwner: z.boolean().optional(),
});
export const createInvoice = z.strictObject({
  customerId: id.nullable(), walkInCustomer: z.boolean(), zoneId: id.nullable(),
  lines: z.array(lineEntry).min(1).max(100),
  payment: z.strictObject({
    cashAmount: z.number().int().nonnegative().nullable(), rest: restPayment, subtractExtraFromDebt: z.boolean().nullable().optional(), payLaterOwnerAgreed: z.boolean().optional(),
  }),
  purchaseRequestId: id.nullable().optional(), takesRequestInFull: z.boolean().nullable().optional(), notSoldWholeLotIds: z.array(id).max(100).optional(),
  discount: z.number().int().nonnegative().nullable().optional(), discountDecidedByOwner: z.boolean().optional(), otherCharges: z.number().int().nonnegative().nullable().optional(),
  deduplicationKey: z.uuid(),
}).refine((v) => v.walkInCustomer ? v.customerId === null : v.customerId !== null);
export const finishInvoice = z.strictObject({ wantsQrCode: z.boolean().nullable() });

/** Câu hỏi xác nhận 409 của backend: client gửi lại cùng yêu cầu kèm cờ có tên trong confirmationField. */
export const confirmationQuestion = z.object({ confirmationField: z.string(), code: z.string().optional(), message: z.string().optional() });

export type SalesInvoice = z.infer<typeof salesInvoice>;
export type LotForSale = z.infer<typeof lotForSale>;
export type CreateInvoice = z.infer<typeof createInvoice>;
