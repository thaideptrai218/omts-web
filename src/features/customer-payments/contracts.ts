import { z } from "zod";

/**
 * Hợp đồng dữ liệu Thanh toán của khách (SCR-DEBT-03) khớp backend develop:
 * GET api/customer-payments/form/{customerId}, GET .../awaiting-confirmation, GET .../{id},
 * POST api/customer-payments, POST .../pay-back, POST .../confirmations, POST .../{id}/cancel.
 */
const id = z.guid(), money = z.number(), date = z.iso.date(), at = z.iso.datetime({ offset: true });
const ref = z.object({ id, name: z.string() });
const customer = z.object({ id, name: z.string(), phoneNumber: z.string().nullable() });

export const method = z.enum(["Cash", "OtherTransfer", "VietQrInvoice"]);
export const unpaidInvoice = z.object({ id, code: z.string(), invoiceDate: date, total: money, covered: money, unpaid: money, ageDays: z.number() });
export const paymentForm = z.object({
  customer, debt: money, owedBack: money, debtAgeDays: z.number().nullable(), unpaidInvoices: z.array(unpaidInvoice), cashCollectors: z.array(ref),
});
export const paymentDetails = z.object({
  id, code: z.string(), customer: customer.nullable(), kind: z.enum(["Payment", "PaidBack"]), amount: money, paymentDate: date, method,
  bankReference: z.string().nullable(), invoice: z.object({ id, code: z.string() }).nullable(), collectedBy: ref.nullable(), recordedBy: ref.nullable(), note: z.string().nullable(),
  statusId: z.number().int(), status: z.string(), confirmedBy: ref.nullable(), confirmedAt: at.nullable(), cancelledBy: ref.nullable(), cancelledAt: at.nullable(), cancelReason: z.string().nullable(), rowVersion: z.string(),
});
export const paymentSaved = z.object({ payment: paymentDetails, debtAfter: money.nullable(), message: z.string(), messageCode: z.string() });
export const awaiting = z.object({
  page: z.object({ items: z.array(paymentDetails), page: z.number().int(), pageSize: z.number().int(), total: z.number().int() }), totalAmount: money, message: z.string().nullable(), messageCode: z.string().nullable(),
});
export const confirmed = z.object({ confirmed: z.array(paymentDetails), cancelled: z.array(paymentDetails), message: z.string(), messageCode: z.string() });

/** Ghi nhận thanh toán hoặc trả lại tiền: khách, ngày, số tiền nguyên, hình thức; tiền mặt cần người nhận, chuyển khoản cần mã giao dịch. */
export const recordPayment = z.strictObject({
  customerId: id, paymentDate: date, amount: z.number().int().positive().max(999_999_999_999), method: z.enum(["Cash", "OtherTransfer"]),
  bankReference: z.string().trim().max(100).nullable(), collectedByAccountId: id.nullable(), note: z.string().trim().max(500).nullable(),
  confirmAboveDebt: z.boolean().optional(), confirmDuplicateBankReference: z.boolean().optional(), deduplicationKey: z.uuid(),
}).refine((v) => v.method === "OtherTransfer" ? !!v.bankReference : true).refine((v) => v.method === "Cash" ? v.collectedByAccountId !== null : true);
export const confirmPayments = z.strictObject({
  confirm: z.array(id).max(100), cancel: z.array(z.strictObject({ id, reason: z.string().trim().min(1).max(500) })).max(100),
}).refine((v) => v.confirm.length + v.cancel.length > 0);
export const cancelPayment = z.strictObject({ reason: z.string().trim().min(1).max(500), rowVersion: z.string().min(1) });

export type PaymentForm = z.infer<typeof paymentForm>;
export type PaymentDetails = z.infer<typeof paymentDetails>;
