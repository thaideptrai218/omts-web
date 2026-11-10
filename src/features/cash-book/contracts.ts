import { z } from "zod";

const id = z.guid(), text = z.string(), n = z.number(), stamp = z.string(), opt = <T extends z.ZodType>(value: T) => value.nullable().optional();

export const fund = z.enum(["Cash", "Bank", "EWallet"]);
export const direction = z.enum(["Receipt", "Payment"]);
export const category = z.enum(["Goods", "OtherIncome", "TransferWithdrawal", "OtherExpense", "Payroll"]);
export const partyKind = z.enum(["Customer", "Supplier", "Employee", "Other"]);
export const accountKind = z.enum(["Bank", "EWallet"]);

export const cashAccount = z.object({
  id, kind: accountKind, bankBin: opt(text), providerName: text, accountNumber: text, holderName: text, note: opt(text), isActive: z.boolean(), isVietQr: z.boolean(), rowVersion: text,
});
export const cashAccounts = z.array(cashAccount);
export const voucherType = z.object({ id, direction, category, name: text, description: opt(text), countsInResult: z.boolean(), isSystem: z.boolean(), manual: z.boolean(), rowVersion: text });
export const voucherTypes = z.array(voucherType);
export const party = z.object({ id, kind: partyKind, code: opt(text), name: text, phoneNumber: opt(text) });
export const parties = z.array(party);
export const people = z.array(z.object({ id, name: text }));
export const banks = z.array(z.object({ bin: text, shortName: text, name: text }));

const accountRef = z.object({ id, providerName: text, accountNumber: text });
const typeRef = z.object({ id, name: text, category });
const partyRef = z.object({ kind: partyKind, id: opt(id), code: opt(text), name: text, phoneNumber: opt(text) });
const person = z.object({ id, name: text });

export const bookRow = z.object({
  id, source: z.enum(["CashVoucher", "SupplierPayment", "SupplierPaidBack"]), code: text, occurredAt: stamp, createdAt: stamp, direction, fund, cashAccount: opt(accountRef), type: typeRef,
  party: opt(partyRef), amount: n, signedAmount: n, collector: opt(person), createdBy: opt(person), note: opt(text), countsInResult: z.boolean(), status: z.enum(["Recorded", "Cancelled"]),
  sourceDocument: opt(z.object({ kind: text, id, code: text })),
});
export const bookPage = z.object({ items: z.array(bookRow), page: n, pageSize: n, total: n, summary: z.object({ opening: n, totalIn: n, totalOut: n, closing: n }) });

export const voucherView = z.object({
  id, code: text, direction, fund, cashAccount: opt(accountRef), type: typeRef, occurredAt: stamp, amount: n, collector: opt(person), party: opt(partyRef), note: opt(text), countsInResult: z.boolean(),
  status: z.enum(["Recorded", "Cancelled"]), cancelledAt: opt(stamp), cancelReason: opt(text), createdAt: stamp, createdBy: opt(person), updatedAt: opt(stamp), rowVersion: text,
});
export const removed = z.object({ done: z.literal(true) });

export type CashFund = z.infer<typeof fund>;
export type CashDirection = z.infer<typeof direction>;
export type CashCategory = z.infer<typeof category>;
export type PartyKind = z.infer<typeof partyKind>;
export type CashAccount = z.infer<typeof cashAccount>;
export type VoucherType = z.infer<typeof voucherType>;
export type Party = z.infer<typeof party>;
export type BookRow = z.infer<typeof bookRow>;
export type BookPage = z.infer<typeof bookPage>;
export type VoucherView = z.infer<typeof voucherView>;
