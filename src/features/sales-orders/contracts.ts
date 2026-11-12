import { z } from "zod";
import { qrView } from "@/features/customers/contracts";

/**
 * Shapes of the Đặt hàng (DH) module of the backend (api/sales-orders), as the BFF at /api/sales-orders hands them over. Money is whole VND, quantities are in
 * the unit of their line (up to 3 decimals), times are ISO-8601 with offset. Enums travel as strings.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), num = z.number(), count = z.number().int();
const person = z.object({ id, name: text });

export const ORDER = { draft: 4101, delivering: 4102, completed: 4103, cancelled: 4104 } as const;
export const REQUEST_ORDERED = 3205;
export const orderSources = ["App", "Phone", "AtPort"] as const;
export const advanceMethods = ["Cash", "OtherTransfer", "VietQr"] as const;
export type OrderSource = (typeof orderSources)[number];
export type AdvanceMethod = (typeof advanceMethods)[number];
/** What the caller may do with an order now (`allowedActions`); the screens show exactly these buttons. */
export type OrderAction = "Edit" | "Finish" | "Cancel" | "AddAdvance" | "Process" | "PlanHarvest" | "Print";

const progress = z.object({ unitId: id, unitCode: text, unitName: text, ordered: num, delivered: num });
export const orderLine = z.object({
  id, lineNumber: count, productId: id, productCode: text, productName: text, unitId: id, unitCode: text, unitName: text, factor: num,
  quantity: num, unitPrice: num, listPrice: num, amount: num, deliveredQuantity: num, note: opt,
});
export const orderAdvance = z.object({
  paymentId: id, paymentCode: text, amount: num, method: text, statusId: count, status: text, paidAt: text, bankReference: opt, collectedBy: person.nullish(),
  allocatedToInvoices: num, reserved: z.boolean(),
});
export const orderInvoice = z.object({ id, code: text, invoicedAt: text, total: num, statusId: count, status: text });
export const orderPlan = z.object({ id, code: text, statusId: count, status: text, plannedAt: opt });
export const orderView = z.object({
  id, code: text, statusId: count, status: text, orderedAt: text, pickupAt: opt,
  customer: z.object({ id, code: text, name: text, phoneNumber: opt }).nullish(), walkInCustomer: z.boolean(), source: z.enum(orderSources), receivedBy: person, createdBy: person.nullish(),
  note: opt, subtotal: num, discount: num, discountDecidedByOwner: z.boolean(), total: num, invoicedTotal: num, customerPaid: num, advanceLeft: num, advanceReserved: z.boolean(),
  lines: z.array(orderLine), progress: z.array(progress), advances: z.array(orderAdvance), invoices: z.array(orderInvoice), harvestPlans: z.array(orderPlan),
  purchaseRequest: z.object({ id, sentAt: text, statusId: count, status: text }).nullish(), allowedActions: z.array(text),
  createdAt: text, completedAt: opt, completedManually: z.boolean(), cancelledAt: opt, cancelReason: opt, rowVersion: text,
});
export const orderRow = z.object({
  id, code: text, statusId: count, status: text, orderedAt: text, pickupAt: opt, waitingDays: count.nullish(), customerId: id.nullish(), customerCode: opt, customerName: opt,
  customerPhone: opt, walkInCustomer: z.boolean(), source: z.enum(orderSources), receivedBy: opt, createdBy: opt, total: num, invoicedTotal: num, customerPaid: num,
  invoiceCodes: z.array(text), progress: z.array(progress), rowVersion: text,
});
export const orderPage = z.object({
  items: z.array(orderRow), page: count, pageSize: count, total: count, summary: z.object({ total: num, invoiced: num, customerPaid: num }),
});
export const nextCode = z.object({ code: text });
/** The form of a new order made from a purchase request. */
export const requestDraft = z.object({
  purchaseRequestId: id, customer: z.object({ id, code: text, name: text, phoneNumber: opt }), sentAt: text, requestStatusId: count,
  lines: z.array(z.object({ productId: id, productCode: text, productName: text, unitId: id, unitCode: text, unitName: text, quantity: num, unitPrice: num })),
  pickupAt: text, source: z.enum(orderSources), note: opt,
});
/** A save (create or update) answers `{ order, message, messageCode, advanceQr }`; `advanceQr` is the code of a VietQR advance taken with the save. */
export const orderSaved = z.object({ order: orderView, message: opt, messageCode: opt, advanceQr: qrView.nullish() });
export const orderClosed = z.object({ order: orderView, creditLeft: num });

export type OrderView = z.infer<typeof orderView>;
export type OrderLineView = z.infer<typeof orderLine>;
export type OrderRow = z.infer<typeof orderRow>;
export type OrderPage = z.infer<typeof orderPage>;
export type OrderProgress = z.infer<typeof progress>;
export type OrderAdvanceView = z.infer<typeof orderAdvance>;
export type RequestDraft = z.infer<typeof requestDraft>;
export type OrderSaved = z.infer<typeof orderSaved>;
export type OrderClosed = z.infer<typeof orderClosed>;
