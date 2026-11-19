import { z } from "zod";

/** Hình dạng JSON của GET api/reports/financial (kết quả kinh doanh theo kỳ); khớp reports/backend-contracts.md. Số có dấu: khoản giảm trừ và chi phí là số âm. */
export const financialUnits = ["month", "quarter", "year"] as const;
export type FinancialUnit = typeof financialUnits[number];

export const financialReport = z.object({
  computedAt: z.string(), from: z.iso.date(), to: z.iso.date(), unit: z.string(),
  columns: z.array(z.object({ key: z.string(), label: z.string(), from: z.iso.date(), to: z.iso.date() })),
  /** `values` theo thứ tự `columns`; `total` là cột tổng của cả khoảng. */
  rows: z.array(z.object({ code: z.string(), section: z.string(), isTotal: z.boolean(), values: z.array(z.number()), total: z.number() })),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type FinancialReport = z.infer<typeof financialReport>;
export type FinancialRow = FinancialReport["rows"][number];
