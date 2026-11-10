import { z } from "zod";

const id = z.guid(), text = z.string(), n = z.number(), date = z.iso.date(), stamp = z.string(), opt = <T extends z.ZodType>(value: T) => value.nullable().optional();
const supplier = z.object({ id, name: text, phoneNumber: text });
const zone = z.object({ id, code: text, name: text });
const account = z.object({ id, name: text });
const paged = <T extends z.ZodType>(row: T) => z.object({ items: z.array(row), page: n, pageSize: n, total: n });
export const method = z.enum(["Cash", "BankTransfer", "Other"]);

export const receiptRow = z.object({
  id, code: text, receiptDate: date, supplier, statusId: n, status: text, total: n, linesTotal: n, supplierCode: text, recordedByName: text,
  itemCount: n, returned: n, discount: n, payable: n, paid: n, zone: opt(zone), notes: opt(text), completedAt: opt(stamp), createdAt: stamp, updatedAt: opt(stamp),
  receivedAt: opt(stamp), receivedByName: opt(text), returnCodes: z.array(text).optional(),
});
export const receiptSearch = z.object({ page: paged(receiptRow), totals: z.object({ count: n, completedCount: n, receiptsTotal: n, returnsTotal: n, netTotal: n }) });

export const receiptView = z.object({
  id, code: text, supplier, receiptDate: date, total: n, returned: n, notes: opt(text), statusId: n, status: text, recordedBy: account,
  completedAt: opt(stamp), cancelledAt: opt(stamp), cancelReason: opt(text), rowVersion: text, discount: n, payable: n, paid: n, zone: opt(zone),
  receivedAt: opt(stamp), receivedBy: opt(account),
  lines: z.array(z.object({
    id, lineNumber: n, itemId: opt(id), itemCode: opt(text), itemName: opt(text), group: opt(text), unit: text, quantity: opt(n), unitPrice: opt(n), lineAmount: opt(n),
    supplierLotCode: opt(text), raft: opt(z.object({ id, code: text, zoneId: id, zoneCode: text })), seedLotCode: opt(text), seeded: n, returnedQuantity: n, returnable: n, discount: opt(n), netUnitPrice: opt(n),
  })),
  returns: z.array(z.object({ id, code: text, returnDate: date, returnedAt: opt(stamp), reason: text, returnValue: n, statusId: n, status: text, discount: n, netValue: n })),
});
export const receiptPayments = z.array(z.object({ id, code: text, paymentDate: date, recordedBy: account, method, statusId: n, status: text, applied: n }));
export const cancelPreview = z.object({ canCancel: z.boolean(), blocked: opt(z.object({ kind: text, code: text })), debtBefore: n, debtAfter: n, advanceAfter: n });
export const receiptCopy = z.object({
  copiedFromCode: text, leftEmpty: z.array(text),
  receipt: z.object({ supplierId: opt(id), notes: opt(text), discount: opt(n), zoneId: opt(id), lines: opt(z.array(z.object({ itemId: opt(id), quantity: opt(n), unitPrice: opt(n), discount: opt(n), supplierLotCode: opt(text), raftId: opt(id) }))) }),
});

export const returnRow = z.object({
  id, code: text, returnDate: date, receiptId: opt(id), receiptCode: opt(text), supplier, supplierCode: text, zone: opt(zone), reason: text, statusId: n, status: text,
  recordedBy: account, value: n, discount: n, netValue: n, itemCount: n, refunded: n, createdAt: stamp, returnedAt: opt(stamp),
});
export const returnSearch = z.object({ page: paged(returnRow), totalValue: n });
export const returnView = z.object({
  id, code: text, receipt: opt(z.object({ id, code: text })), supplier, zone: opt(zone), returnDate: date, returnedAt: opt(stamp), reason: text, discount: n, statusId: n, status: text,
  cancelReason: opt(text), recordedBy: account, returnValue: n, netValue: n, rowVersion: text,
  lines: z.array(z.object({ receiptLineId: opt(id), itemId: id, itemCode: text, itemName: text, unit: text, quantity: n, unitPrice: n, returnValue: n })),
  refunds: z.array(z.object({ id, code: text, paymentDate: date, amount: n, method, bankReference: opt(text), statusId: n, status: text })),
});
export const cancelledReturn = z.object({ receipt: opt(z.unknown()), return: opt(z.unknown()) }).or(z.object({ id }));
export const raftLookup = z.array(z.object({ id, code: text, zoneCode: text, zoneId: id }));
export const removed = z.object({ done: z.literal(true) });
export const receivers = z.array(account);
const editableMethod = z.enum(["Cash", "BankTransfer"]);
/** A supplier payment voucher (Phiếu chi) or money paid back, with its allocation to receipts on the detail. */
export const paymentView = z.object({
  id, code: text, supplier, kind: z.enum(["Payment", "PaidBack"]), amount: n, discountAmount: opt(n), paymentDate: date, paidAt: opt(stamp), method, cashAccount: opt(z.object({ id, providerName: text, accountNumber: text })), bankReference: opt(text), note: opt(text),
  statusId: n, status: text, cancelReason: opt(text), rowVersion: text, recordedBy: opt(account), paidBy: opt(account),
  allocations: opt(z.array(z.object({ receiptId: id, receiptCode: text, receivedAt: opt(stamp), receiptPayable: n, paidBefore: n, amount: n, receiptRemaining: n }))),
});
export const supplierDebt = z.object({ supplier: supplier.extend({ statusId: n }), debtToday: n,
  unpaidReceipts: z.array(z.object({ id, code: text, receiptDate: date, receivedAt: opt(stamp), total: n, returned: n, covered: n, remaining: n, discount: opt(n) })) });
export const paymentMethods = editableMethod;
export type PaymentView = z.infer<typeof paymentView>;
export type SupplierDebt = z.infer<typeof supplierDebt>;
/** Raft material cost from material usage, each usage priced at the latest purchase price of its item. */
export const raftCosts = z.object({ materialCost: n, rafts: z.array(z.object({ raft: z.object({ id, code: text }), materialCost: n, unpricedCount: n,
  usages: z.array(z.object({ usageId: id, date, itemCode: text, itemName: text, unit: text, quantity: n, unitPrice: n, amount: n, unpriced: z.boolean() })) })) });

export type ReceiptRow = z.infer<typeof receiptRow>;
export type ReceiptView = z.infer<typeof receiptView>;
export type ReturnRow = z.infer<typeof returnRow>;
export type ReturnView = z.infer<typeof returnView>;
