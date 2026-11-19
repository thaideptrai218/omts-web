import { z } from "zod";

/**
 * Hình dạng JSON của GET api/reports/end-of-day (báo cáo Cuối ngày, 4 mối quan tâm); khớp EndOfDayDtos.cs của backend.
 * Mỗi phản hồi chỉ có khối của mối quan tâm đã chọn (riêng summary có ba phần tóm tắt); các khối còn lại vắng mặt.
 */
const amount = z.number(), id = z.guid(), stamp = z.string(), text = z.string();

export const endOfDayConcerns = ["sales", "money", "goods", "summary"] as const;
export type EndOfDayConcern = typeof endOfDayConcerns[number];
export const endOfDayFunds = ["Cash", "Bank", "EWallet"] as const;
export type EndOfDayFund = typeof endOfDayFunds[number];
export const endOfDayPaymentMethods = ["Cash", "VietQrInvoice", "OtherTransfer", "EWallet"] as const;
export const endOfDayChannels = ["App", "Phone", "AtPort"] as const;
export const endOfDayPaymentTerms = ["PayNow", "PayLater"] as const;
export const endOfDaySources = ["CustomerPayment", "CustomerPaidBack", "SupplierPayment", "SupplierPaidBack", "CashVoucher"] as const;
export const endOfDayPartyKinds = ["Customer", "Supplier", "Employee", "Other"] as const;
export const endOfDayOrientations = ["portrait", "landscape"] as const;
export type EndOfDayOrientation = typeof endOfDayOrientations[number];

const named = z.object({ id, name: text });
const salesRow = z.object({
  id, code: text, at: stamp, customer: named.nullable(), zoneName: text.nullable(),
  quantityKg: amount, revenue: amount, discount: amount, otherCharges: amount, paid: amount, debt: amount,
});
const fundRow = z.object({ fund: z.enum(endOfDayFunds), receipts: amount, payments: amount, net: amount });
const moneyTotals = z.object({ receipts: amount, payments: amount, net: amount });
const moneyEntry = z.object({
  source: text, code: text.nullable(), at: stamp, direction: z.enum(["Receipt", "Payment"]), fund: z.enum(endOfDayFunds),
  typeName: text.nullable(), partyKind: text.nullable(), partyName: text.nullable(), amount, note: text.nullable(), createdByName: text.nullable(),
});
const goodsDetail = z.object({ documentId: id, code: text, kind: z.enum(["Invoice", "Return"]), at: stamp, customerName: text.nullable(), kg: amount, value: amount });
const goodsProduct = z.object({
  productId: id, code: text.nullable(), name: text, unit: text, soldKg: amount, revenue: amount, returnedKg: amount, returnValue: amount, netRevenue: amount,
  details: z.array(goodsDetail),
});
const goodsTotals = z.object({ soldKg: amount, revenue: amount, returnedKg: amount, returnValue: amount, netRevenue: amount, lotCount: z.number().int(), weighedKg: amount });
const lot = z.object({ id, lotCode: text, zoneName: text, weighedKg: amount, weighedAt: stamp });
const names = z.array(named), strings = z.array(text);

export const endOfDayReport = z.object({
  computedAt: stamp, concern: z.enum(endOfDayConcerns), from: stamp, to: stamp,
  filters: z.object({
    zones: names, customers: names, products: names, categories: names, people: names, receivedBy: names, createdBy: names, types: names,
    paymentMethods: strings, channels: strings, paymentTerms: strings, funds: strings, sources: strings, partyKinds: strings,
  }),
  sales: z.object({
    groups: z.array(z.object({
      kind: z.enum(["Order", "Invoice", "Return"]), count: z.number().int(), quantityKg: amount, revenue: amount, discount: amount, otherCharges: amount, paid: amount, debt: amount,
      rows: z.array(salesRow),
    })),
    totals: z.object({ quantityKg: amount, revenue: amount, discount: amount, otherCharges: amount, paid: amount, debt: amount, netRevenue: amount }),
  }).nullish(),
  money: z.object({ entries: z.array(moneyEntry), byFund: z.array(fundRow), totals: moneyTotals }).nullish(),
  goods: z.object({ products: z.array(goodsProduct), lots: z.array(lot), totals: goodsTotals }).nullish(),
  summary: z.object({
    sales: z.object({
      orderCount: z.number().int(), orderValue: amount, deposits: amount, invoiceCount: z.number().int(), revenue: amount, discount: amount,
      returnCount: z.number().int(), returnValue: amount, netRevenue: amount, paid: amount, debt: amount,
    }),
    money: z.object({ byFund: z.array(fundRow), totals: moneyTotals }),
    goods: z.object({ productCount: z.number().int(), soldKg: amount, returnedKg: amount, lotCount: z.number().int(), weighedKg: amount }),
  }).nullish(),
  message: text.nullable(), messageCode: text.nullable(),
});

export type EndOfDayReport = z.infer<typeof endOfDayReport>;
export type SalesGroup = NonNullable<EndOfDayReport["sales"]>["groups"][number];
export type SalesRow = SalesGroup["rows"][number];
export type MoneyEntry = NonNullable<EndOfDayReport["money"]>["entries"][number];
export type FundRow = z.infer<typeof fundRow>;
export type GoodsProduct = NonNullable<EndOfDayReport["goods"]>["products"][number];
export type GoodsLot = NonNullable<EndOfDayReport["goods"]>["lots"][number];
