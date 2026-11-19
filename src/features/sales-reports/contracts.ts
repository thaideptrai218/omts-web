import { z } from "zod";

/** Hình dạng JSON của GET api/reports/sales-performance (REPORT-01); khớp SalesPerformanceDtos.cs của backend. */
const amount = z.number(), nullableAmount = z.number().nullable(), id = z.guid(), date = z.iso.date();
const choice = z.object({ id, name: z.string() });

/** Các cột công nợ/thu tiền chỉ có khi gộp theo khách hàng; các cách gộp khác trả null. */
const figures = {
  invoiceCount: z.number().int(), invoicedKg: amount, revenue: amount, priceCuts: amount, salesReturns: amount, netRevenue: amount, soldKg: amount,
  netMoneyReceived: nullableAmount, receivable: nullableAmount, owedBack: nullableAmount, netDebt: nullableAmount,
};

export const salesGroupBy = ["customer", "product", "zone", "day", "week", "month"] as const;
export type SalesGroupBy = typeof salesGroupBy[number];

export const salesReport = z.object({
  computedAt: z.string(), from: date, to: date, groupBy: z.string(),
  filters: z.object({ zones: z.array(choice), customers: z.array(choice), products: z.array(choice) }),
  groups: z.array(z.object({ key: z.string(), label: z.string(), ...figures })),
  totals: z.object(figures),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type SalesReport = z.infer<typeof salesReport>;
export type SalesGroup = SalesReport["groups"][number];

export const salesInvoiceList = z.object({
  from: date, to: date, groupBy: z.string(), groupKey: z.string(),
  invoices: z.array(z.object({
    id, code: z.string(), date,
    customer: z.object({ id, name: z.string() }).nullable(),
    zone: z.object({ id, code: z.string(), name: z.string() }),
    total: amount, returnValue: amount, net: amount,
  })),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type SalesInvoiceList = z.infer<typeof salesInvoiceList>;
