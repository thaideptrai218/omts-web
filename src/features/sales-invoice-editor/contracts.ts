import { z } from "zod";

/**
 * Shape of the form that opens "Xử lý đặt hàng" (GET api/sales-orders/{id}/invoice-draft): what is still to deliver on each line of the order, at the price and in the unit
 * of the order line, the lot proposed for it, what is left of the advance held for the order and the share of the order discount. Money is whole VND, quantities are in
 * the unit of the line.
 */
const id = z.guid(), num = z.number(), text = z.string();

export const draftLine = z.object({
  salesOrderLineId: id, lineNumber: z.number().int().nullish(), productId: id, productCode: text, productName: text, unitId: id, unitCode: text.nullish(), unitName: text, factor: num,
  orderedQuantity: num, deliveredQuantity: num,
  /** What is still to deliver in the unit of the line: 0 for a line already delivered in full (it stays so the seller can add to it). */
  quantity: num, unitPrice: num, listPrice: num.nullish(), amount: num.nullish(),
  suggestedLotId: id.nullish(), suggestedLotCode: text.nullish(), suggestedByPlan: z.boolean().nullish(),
});
export const invoiceDraft = z.object({
  order: z.object({ id, code: text, statusId: z.number().int(), status: text.nullish(), canFinish: z.boolean().nullish() }),
  /** The zone of the first lot proposed (an order has no zone of its own); null when no lot is proposed. */
  zone: z.object({ id, code: text, name: text }).nullish(),
  customer: z.object({ id, code: text.nullish(), name: text, phoneNumber: text.nullish() }).nullish(), walkInCustomer: z.boolean(),
  lines: z.array(draftLine),
  /** The goods of the proposed invoice, the order discount, the share of it this invoice proposes (for that goods amount) and the total. */
  subtotal: num, orderDiscount: num, discountShare: num, total: num.nullish(),
  /** What is left of the advance held for the order: it pays the invoice first. */
  advanceLeft: num.default(0), advanceUse: num.nullish(), nextCode: text.nullish(),
});
export const nextCode = z.object({ code: text });

export type DraftLine = z.infer<typeof draftLine>;
export type InvoiceDraft = z.infer<typeof invoiceDraft>;
