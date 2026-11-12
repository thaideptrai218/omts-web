import { z } from "zod";
import { createOperationsRepository } from "@/features/operations/repository";
import { lotsForSale, salesInvoice, salesInvoiceSent } from "@/features/sales-invoices/contracts";
import type { CreateInvoice, UpdateInvoice } from "@/features/sales-invoices/contracts";
import { createResult, pendingSale } from "@/features/sales-invoices/vietqr-contracts";
import * as c from "./contracts";

const sales = createOperationsRepository("sales-invoices");
/** The calls of the invoice editor (BFF /api/operations/sales-invoices): the form of an order, the lots on sale, one invoice, and the two saves. */
export const invoiceEditorRepository = {
  draft: (orderId: string, signal?: AbortSignal) => sales.read("order-draft", { id: orderId }, c.invoiceDraft, signal),
  nextCode: (signal?: AbortSignal) => sales.read("next-code", {}, c.nextCode, signal),
  /** The lots on sale; for an order, the lots of the harvest plans that serve it come first, marked. */
  lots: (orderId?: string, signal?: AbortSignal) => sales.read("lots", { id: orderId }, lotsForSale, signal),
  /** The VietQR sales still waiting for their transfer: found again after a reload, or when the first answer was lost. */
  pending: (signal?: AbortSignal) => sales.read("pending", {}, z.array(pendingSale), signal),
  invoice: (id: string, signal?: AbortSignal) => sales.read("detail", { id }, salesInvoice, signal),
  /** 201 the saved invoice, or 202 a VietQR sale waiting for its transfer. */
  create: (body: CreateInvoice) => sales.write("create", body, createResult),
  update: (id: string, body: UpdateInvoice) => sales.write("update", body, salesInvoiceSent, id),
};
