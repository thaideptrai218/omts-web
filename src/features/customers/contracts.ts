import { z } from "zod";

/**
 * Shapes of the customer module of the backend (api/customers, api/customer-debts, api/customer-payments), as the BFF at
 * /api/customers hands them over. Money is whole VND; times are ISO-8601 with offset; dates are yyyy-MM-dd.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), money = z.number(), count = z.number().int();
const person = z.object({ id, name: text });

export const IN_USE = 101, DISCONTINUED = 102;
export const customerTypes = [["Individual", "Cá nhân"], ["Company", "Công ty"]] as const;
export const genders = [["Male", "Nam"], ["Female", "Nữ"]] as const;
export const typeLabel = (value: string | null | undefined) => customerTypes.find(([key]) => key === value)?.[1] ?? "Cá nhân";
export const genderLabel = (value: string | null | undefined) => genders.find(([key]) => key === value)?.[1] ?? "";

/** The list never carries the identity number or the bank; the figures are null without the debt permission. */
export const customerRow = z.object({
  id, code: text, name: text, phoneNumber: opt, address: opt, hasTraderAccount: z.boolean(), rowVersion: text, statusId: count, status: text,
  customerType: text, gender: opt, birthDate: opt, phoneNumber2: opt, email: opt, facebook: opt, province: opt, ward: opt, companyName: opt, taxCode: opt, note: opt,
  photoUrl: opt, lastTransactionAt: opt, createdAt: text, createdBy: opt, currentDebt: money.nullish(), totalSales: money.nullish(), netSales: money.nullish(),
});
export const customerPage = z.object({
  items: z.array(customerRow), page: count, pageSize: count, total: count,
  summary: z.object({ debt: money.nullish(), totalSales: money.nullish(), netSales: money.nullish() }).nullish(),
});
export const customerDetail = z.object({
  id, code: text, name: text, phoneNumber: opt, email: opt, address: opt, note: opt, phoneLocked: z.boolean(),
  traderAccount: z.object({ accountId: id, username: opt, displayName: text }).nullish(), mergedIntoCustomerId: id.nullish(), currentDebt: money.nullish(), rowVersion: text,
  statusId: count, status: text, customerType: text, gender: opt, birthDate: opt, phoneNumber2: opt, facebook: opt, province: opt, ward: opt, companyName: opt, taxCode: opt,
  identityNumber: opt, bankBin: opt, bankName: opt, bankAccountNumber: opt, photoUrl: opt, createdAt: text, createdBy: opt, isUsed: z.boolean().nullish(),
});
export const customerSaved = z.object({ customer: customerDetail });
export const bulkResult = z.object({ succeeded: count, failed: count, outcomes: z.array(z.object({ id, succeeded: z.boolean(), code: opt, message: opt })) });
export const importResult = z.object({ imported: count, errors: z.array(z.object({ row: count, fields: z.array(text), message: text })) });
export const removed = z.object({ done: z.literal(true) });

const mergeParty = z.object({ id, code: opt, name: text, phoneNumber: opt, hasTraderAccount: z.boolean(), currentDebt: money, rowVersion: text });
export const mergePreview = z.object({
  kept: mergeParty, merged: mergeParty, countedWithKept: z.array(z.object({ name: text, count })).nullish(), requiresOwnerApproval: z.boolean(), confirmation: opt, locksMergedAccount: z.boolean().nullish(),
});

/** Sales history: just what the tab shows of an invoice. */
export const invoiceRow = z.object({
  id, code: text, invoicedAt: text, total: money, statusId: count, status: text, paymentTerm: opt, unpaidAmount: money.nullish(), priceCutTotal: money.nullish(),
  zone: z.object({ code: text, name: text }).nullish(),
}).loose();
export const invoicePage = z.object({ page: z.object({ items: z.array(invoiceRow), page: count, pageSize: count, total: count }), completedTotal: money.nullish() }).loose();
export const requestRow = z.object({
  id, productName: text, requestedKg: money, pickupDate: text, note: opt, sentAt: text, statusId: count, status: text, fulfilled: z.boolean().nullish(),
}).loose();
export const requestPage = z.object({ items: z.array(requestRow), page: count, pageSize: count, total: count });

export const unpaidInvoice = z.object({ id, code: text, invoiceDate: text, total: money, covered: money, unpaid: money, ageDays: count });
const debtCustomer = z.object({ id, name: text, phoneNumber: opt, code: opt });
export const entryKinds = ["Invoice", "PriceCut", "Return", "Payment", "Discount", "PaidBack", "Adjustment"] as const;
export const debtEntry = z.object({
  date: text, kind: z.enum(entryKinds), id, code: text, amount: money, debtChange: money, invoiceCode: opt, method: opt, awaitingConfirmation: z.boolean(), cancelled: z.boolean(),
  pending: z.boolean().nullish(), debtAfter: money, cancelledAt: opt, recordedBy: person.nullish(), confirmedBy: person.nullish(), collectedBy: person.nullish(), note: opt, cancelReason: opt, at: opt,
});
export const debtTab = z.object({
  customer: debtCustomer, debt: money, debtAgeDays: count.nullish(), unpaidInvoices: z.array(unpaidInvoice),
  entries: z.object({ items: z.array(debtEntry), page: count, pageSize: count, total: count }), openingDebt: money, awaitingConfirmationCount: count, pendingTransferCount: count,
});

export const bankAccount = z.object({ id, bankBin: opt, providerName: text, accountNumber: text, holderName: text, isDefault: z.boolean().nullish() });
export const paymentForm = z.object({
  customer: debtCustomer, debt: money, owedBack: money, debtAgeDays: count.nullish(), unpaidInvoices: z.array(unpaidInvoice), cashCollectors: z.array(person), bankAccounts: z.array(bankAccount),
});
export const qrView = z.object({ payload: text, bankBin: text, bankName: text, accountNumber: text, accountHolderName: text, amount: money, content: text });
export const PAYMENT = { awaiting: 3601, completed: 3602, cancelled: 3603, pending: 3604 } as const;
export const paymentDetails = z.object({
  id, code: text, customer: debtCustomer.nullish(), kind: z.enum(["Payment", "PaidBack"]), amount: money, paymentDate: text, method: text, bankReference: opt, invoice: z.object({ id, code: text }).nullish(),
  collectedBy: person.nullish(), recordedBy: person.nullish(), note: opt, statusId: count, status: text, confirmedBy: person.nullish(), confirmedAt: opt, cancelledBy: person.nullish(), cancelledAt: opt, cancelReason: opt,
  rowVersion: text, paidAt: opt, discountAmount: money.nullish(), cashAccount: z.object({ id, providerName: text, accountNumber: text }).nullish(),
  allocations: z.array(z.object({ id: id.optional(), invoiceId: id, invoiceCode: text, invoicedAt: opt, invoiceTotal: money.nullish(), amount: money })).nullish(),
});
export const paymentSaved = z.object({ payment: paymentDetails, debtAfter: money.nullish(), qr: qrView.nullish() });
export const adjustmentSaved = z.object({ adjustment: z.object({ id, code: text, amount: money, occurredAt: opt, reason: opt, cancelled: z.boolean().nullish(), rowVersion: opt }).loose(), debtAfter: money.nullish() });

export type CustomerRow = z.infer<typeof customerRow>;
export type CustomerPage = z.infer<typeof customerPage>;
export type CustomerDetail = z.infer<typeof customerDetail>;
export type BulkResult = z.infer<typeof bulkResult>;
export type ImportResult = z.infer<typeof importResult>;
export type MergePreview = z.infer<typeof mergePreview>;
export type InvoiceRow = z.infer<typeof invoiceRow>;
export type RequestRow = z.infer<typeof requestRow>;
export type UnpaidInvoice = z.infer<typeof unpaidInvoice>;
export type DebtEntry = z.infer<typeof debtEntry>;
export type DebtTab = z.infer<typeof debtTab>;
export type PaymentForm = z.infer<typeof paymentForm>;
export type PaymentDetails = z.infer<typeof paymentDetails>;
export type PaymentSaved = z.infer<typeof paymentSaved>;
export type QrView = z.infer<typeof qrView>;
export type EntryKind = (typeof entryKinds)[number];

/** What a failed call may tell on top of its message code (the BFF passes on only this allow-listed part of the problem). */
export const problemExtras = z.object({
  field: z.string().max(60).optional(), fields: z.array(z.string().max(60)).max(20).optional(), existingId: id.optional(), canDiscontinue: z.boolean().optional(),
  canKeepMergedInstead: z.boolean().optional(), references: z.array(z.object({ name: z.string().max(100), count })).max(20).optional(),
});
export type Problem = z.infer<typeof problemExtras>;

/** `method` of a payment as the backend names it; EWallet only comes from a Sổ quỹ voucher into an e-wallet account. */
export const methodLabel = (value: string | null | undefined) => ({ Cash: "Tiền mặt", OtherTransfer: "Chuyển khoản", VietQrInvoice: "VietQR", EWallet: "Ví điện tử" } as Record<string, string>)[value ?? ""] ?? "";

export const kindLabel: Record<EntryKind, string> = {
  Invoice: "Bán hàng", PriceCut: "Giảm giá sau bán", Return: "Trả hàng", Payment: "Khách thanh toán", Discount: "Chiết khấu thanh toán", PaidBack: "Trả lại khách", Adjustment: "Điều chỉnh",
};
