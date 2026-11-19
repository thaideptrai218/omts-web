import { z } from "zod";

/** Hình dạng JSON của GET api/reports/product-stock (xuất nhập tồn theo kg); khớp reports/backend-contracts.md. */
const kgValue = z.number(), choice = z.object({ id: z.guid(), name: z.string() });

const figures = { openingKg: kgValue, receivedKg: kgValue, soldKg: kgValue, disposedKg: kgValue, adjustmentKg: kgValue, closingKg: kgValue, closingValue: kgValue };

export const productStockGroupBy = ["product", "category"] as const;
export type ProductStockGroupBy = typeof productStockGroupBy[number];

export const productStockReport = z.object({
  computedAt: z.string(), from: z.iso.date(), to: z.iso.date(), groupBy: z.string(),
  filters: z.object({ products: z.array(choice), categories: z.array(choice) }),
  /** `key` là id sản phẩm, id nhóm hàng hoặc `uncategorized`; `code` và `unitPrice` chỉ có khi gộp theo sản phẩm. */
  groups: z.array(z.object({ key: z.string(), label: z.string(), code: z.string().nullable(), unitPrice: z.number().nullable(), ...figures })),
  totals: z.object(figures),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type ProductStockReport = z.infer<typeof productStockReport>;
export type ProductStockGroup = ProductStockReport["groups"][number];
