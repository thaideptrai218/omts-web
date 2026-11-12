import { z } from "zod";

/**
 * Hợp đồng dữ liệu Hóa đơn bán (SCR-SALE-04 / SALE-05) khớp backend develop:
 * POST /api/sales-invoices (lập từ đơn đặt hàng), PUT /api/sales-invoices/{id} (sửa), GET /api/sales-invoices/{id}, GET .../publish-check,
 * POST .../finish, POST .../resend,
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
  // Lô ghi từ kế hoạch thu hoạch (KHT) nào; `suggested` = kế hoạch đó phục vụ đơn đặt hàng đang xử lý (chỉ có khi hỏi theo đơn): các lô này đứng đầu danh sách.
  harvestPlanCode: z.string().nullish(), suggested: z.boolean().nullish(),
  // Sản phẩm của lô đã tách theo sản phẩm (rỗng với lô cũ); hóa đơn chỉ được bán các sản phẩm này từ lô.
  products: z.array(z.object({ productId: id, productCode: z.string(), productName: z.string(), harvestedKg: z.number(), remainingKg: z.number() })).optional(),
});
export const lotsForSale = z.object({ lots: z.array(lotForSale), message: z.string().nullable(), messageCode: z.string().nullable() });

const accountRef = z.object({ id, name: z.string() });
const payment = z.object({
  id, code: z.string(), kind: z.enum(["Payment", "PaidBack"]), method: z.enum(["VietQrInvoice", "OtherTransfer", "Cash"]), amount: money,
  paymentDate: z.iso.date(), statusId: z.number().int(), status: z.string(), collectedBy: accountRef.nullable(),
});
/** Đơn vị của dòng và số lượng theo đơn vị đó; hóa đơn cũ (lập trước khi có đơn vị) không có hai trường này: dòng tính theo kg. */
const lineUnit = z.object({ id, code: z.string(), name: z.string(), factor: money });
const line = z.object({
  id, lineNumber: z.number().int(), productId: id, productName: z.string(), harvestLotId: id, lotCode: z.string(), kg: money, unitPrice: money, listPrice: money,
  // PriceList | DecidedByOwner | OrderPrice (giá của dòng đơn đặt hàng): chỉ dùng để hiển thị nhãn, nên không chặn giá trị mới.
  priceSource: z.string(), amount: money, soldWholeLot: z.boolean(),
  unit: lineUnit.nullish(), quantity: money.nullish(), salesOrderLineId: id.nullish(),
});
const sending = z.object({ channel: z.string(), phoneNumber: z.string().nullable(), deliveryStatusId: z.number().int(), deliveryStatus: z.string(), deliveryStatusAt: at.nullable() });

export const salesInvoice = z.object({
  id, code: z.string(), invoicedAt: at, invoiceDate: z.iso.date(), zone: z.object({ id, code: z.string(), name: z.string() }),
  customer: z.object({ id, name: z.string(), phoneNumber: z.string().nullable(), code: z.string().nullish() }).nullable(), walkInCustomer: z.boolean(),
  salesOrder: z.object({ id, code: z.string() }).nullish(), note: z.string().nullish(),
  purchaseRequestId: id.nullable(), takesRequestInFull: z.boolean(), lines: z.array(line), totalKg: money, subtotal: money, discount: money, discountDecidedByOwner: z.boolean(),
  otherCharges: money, priceCutTotal: money, total: money, paymentTerm, statusId: z.number().int(), status: z.string(), payments: z.array(payment), createdBy: accountRef,
  qrToken: z.string().nullable(), qrUrl: z.string().nullable(), qrDecidedAt: at.nullable(), deliveryStatusId: z.number().int(), deliveryStatus: z.string(), sendings: z.array(sending), rowVersion: z.string(),
});
/** Đơn đặt hàng sau khi lưu hóa đơn: `canFinish` = đơn còn dòng chưa giao đủ, hỏi người dùng có kết thúc đơn không. */
export const orderAfterSave = z.object({ id, code: z.string(), statusId: z.number().int(), status: z.string().nullish(), canFinish: z.boolean() });
export const salesInvoiceSaved = z.object({
  invoice: salesInvoice, change: money, subtractedFromDebt: money, message: z.string(), messageCode: z.string(),
  order: orderAfterSave.nullish(), orderCanFinish: z.boolean().nullish(),
});

const invoiceLotOrigin = z.object({
  harvestLotId: id, lotCode: z.string(), originState, missing: z.array(z.unknown()), message: z.string().nullable(), messageCode: z.string().nullable(),
});
export const publishCheck = z.object({ invoiceId: id, invoiceCode: z.string(), lots: z.array(invoiceLotOrigin), getsQrCode: z.boolean() });
export const salesInvoiceSent = z.object({
  invoice: salesInvoice, deliveryStatusId: z.number().int(), deliveryStatus: z.string(), qrUrl: z.string().nullable(), lots: z.array(invoiceLotOrigin), message: z.string().nullable(), messageCode: z.string().nullable(),
});

const code = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/);
/**
 * Một dòng hóa đơn: kg cân luôn bắt buộc (sổ kho); `quantity` chỉ gửi khi đơn vị không phải kg. Đơn giá là giá theo đơn vị của dòng;
 * bỏ trống thì backend dùng giá dòng đơn đặt hàng. `priceDecidedByOwner` chỉ gửi khi đã hỏi Chủ HTX.
 */
export const lineEntry = z.strictObject({
  productId: id, harvestLotId: id, kg: z.number().positive().max(1_000_000), salesOrderLineId: id.nullable().optional(), unitId: id.optional(),
  quantity: z.number().positive().max(1_000_000_000).optional(), unitPrice: z.number().int().positive().nullable().optional(), priceDecidedByOwner: z.boolean().optional(),
});
const invoiceFields = {
  code: code.nullable().optional(), note: z.string().max(1000).nullable().optional(),
  lines: z.array(lineEntry).min(1).max(100), notSoldWholeLotIds: z.array(id).max(100).optional(),
  discount: z.number().int().nonnegative().nullable().optional(), discountDecidedByOwner: z.boolean().optional(), otherCharges: z.number().int().nonnegative().nullable().optional(),
};
/** Lập hóa đơn từ một đơn đặt hàng: khách và vùng lấy từ đơn nên không gửi. */
export const createInvoice = z.strictObject({
  salesOrderId: id, ...invoiceFields,
  payment: z.strictObject({
    cashAmount: z.number().int().nonnegative().nullable(), rest: restPayment, subtractExtraFromDebt: z.boolean().nullable().optional(), payLaterOwnerAgreed: z.boolean().optional(),
  }),
  deduplicationKey: z.uuid(),
});
/** Sửa hóa đơn như sửa phiếu nhập: gửi lại toàn bộ nội dung; khách, vùng và thanh toán không đổi. */
export const updateInvoice = z.strictObject({ ...invoiceFields, rowVersion: z.string().min(1).max(200), confirmOwedBack: z.boolean().optional() });
export const finishInvoice = z.strictObject({ wantsQrCode: z.boolean().nullable() });

/** Câu hỏi xác nhận 409 của backend: client gửi lại cùng yêu cầu kèm cờ có tên trong confirmationField. */
export const confirmationQuestion = z.object({ confirmationField: z.string(), code: z.string().optional(), message: z.string().optional() });

export type SalesInvoice = z.infer<typeof salesInvoice>;
export type LotForSale = z.infer<typeof lotForSale>;
export type CreateInvoice = z.infer<typeof createInvoice>;
export type UpdateInvoice = z.infer<typeof updateInvoice>;
