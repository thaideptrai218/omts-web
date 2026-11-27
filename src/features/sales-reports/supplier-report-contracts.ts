import { z } from "zod";

/** Hình dạng JSON của GET api/reports/purchases và /purchases/lines (hàng nhập theo nhà cung cấp); khớp reports/backend-contracts.md. */
const amount = z.number(), quantity = z.number().nullable(), date = z.iso.date();

/** Số lượng chỉ có khi gộp theo mặt hàng (đơn vị gốc); gộp theo nhà cung cấp trả null. */
/**
 * `receivedValue` is the goods alone (Tiền hàng); `vatAmount` is the input VAT of the receipts, less the VAT paid back on returns; `netValue` (Tổng trả NCC) includes it.
 * An API without input VAT sends no `vatAmount`, which reads as 0.
 */
const figures = { receiptCount: z.number().int(), returnCount: z.number().int(), receivedValue: amount, returnedValue: amount, vatAmount: amount.nullish(), netValue: amount, receivedQuantity: quantity, returnedQuantity: quantity };

export const purchaseGroupBy = ["supplier", "item"] as const;
export type PurchaseGroupBy = typeof purchaseGroupBy[number];
export const purchaseKinds = ["all", "Seed", "Supply"] as const;
export type PurchaseKind = typeof purchaseKinds[number];

export const purchaseReport = z.object({
  computedAt: z.string(), from: date, to: date, groupBy: z.string(),
  filters: z.object({ suppliers: z.array(z.object({ id: z.guid(), name: z.string() })), kind: z.string() }),
  /** `key` là id nhà cung cấp hoặc mặt hàng; khi xem theo mặt hàng có thêm nhóm `receipt-discounts` (chiết khấu cả phiếu, số âm). */
  groups: z.array(z.object({ key: z.string(), label: z.string(), code: z.string().nullable(), unit: z.string().nullable(), ...figures })),
  totals: z.object(figures),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type PurchaseReport = z.infer<typeof purchaseReport>;
export type PurchaseGroup = PurchaseReport["groups"][number];

export const purchaseLines = z.object({
  from: date, to: date, groupBy: z.string(), groupKey: z.string(),
  documents: z.array(z.object({
    id: z.guid(), code: z.string(), date, isReturn: z.boolean(), receiptKind: z.string().nullable(),
    supplier: z.object({ id: z.guid(), name: z.string() }), value: amount,
  })),
  message: z.string().nullable(), messageCode: z.string().nullable(),
});
export type PurchaseLines = z.infer<typeof purchaseLines>;
