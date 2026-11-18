import { z } from "zod";

/** Hình dạng JSON của GET api/reports/end-of-day (báo cáo Cuối ngày); khớp EndOfDayDtos.cs của backend. */
const amount = z.number(), id = z.guid(), stamp = z.string();
export const endOfDayMethods = ["Cash", "Bank", "EWallet"] as const;
export type EndOfDayMethod = typeof endOfDayMethods[number];

const salesTotals = z.object({ invoiceCount: z.number().int(), kg: amount, revenue: amount, paidNow: amount, returnCount: z.number().int(), returnValue: amount, netRevenue: amount });
const moneyEntry = z.object({
  source: z.string(), code: z.string().nullable(), occurredAt: stamp, direction: z.enum(["Receipt", "Payment"]), fund: z.enum(endOfDayMethods),
  partyName: z.string().nullable(), amount, note: z.string().nullable(),
});

export const endOfDayReport = z.object({
  computedAt: stamp, date: z.iso.date(),
  sales: z.object({
    invoices: z.array(z.object({ id, code: z.string(), invoicedAt: stamp, customer: z.object({ id, name: z.string() }).nullable(), zoneName: z.string(), kg: amount, total: amount, paidNow: amount })),
    returns: z.array(z.object({ id, code: z.string(), invoiceId: id, invoiceCode: z.string(), customerName: z.string().nullable(), zoneName: z.string(), value: amount })),
    totals: salesTotals,
  }),
  money: z.object({
    entries: z.array(moneyEntry),
    byFund: z.array(z.object({ fund: z.enum(endOfDayMethods), receipts: amount, payments: amount, net: amount })),
    totals: z.object({ receipts: amount, payments: amount, net: amount }),
  }),
  goods: z.object({
    products: z.array(z.object({ productId: id, code: z.string().nullable(), name: z.string(), kg: amount })),
    lots: z.array(z.object({ id, lotCode: z.string(), zoneName: z.string(), weighedKg: amount, weighedAt: stamp })),
    totals: z.object({ soldKg: amount, lotCount: z.number().int(), weighedKg: amount }),
  }),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type EndOfDayReport = z.infer<typeof endOfDayReport>;
export type MoneyEntry = z.infer<typeof moneyEntry>;
