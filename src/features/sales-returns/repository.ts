import { createOperationsRepository } from "@/features/operations/repository";
import { returnPage, returnPreview, returnSaved, returnView, type CancelReturnBody, type CreateReturnBody, type ReturnListQuery } from "./return-contracts";

const repository = createOperationsRepository("sales-returns");

/** The calls of the sales return module, all through the sales-returns door of the BFF (`/api/operations/sales-returns`). `invoiceId` is the id of the invoice, `id` the id of the return. */
export const returnRepository = {
  list: (query: ReturnListQuery, signal?: AbortSignal) => repository.read("list", query, returnPage, signal),
  /** The file takes the same filters as the list, without paging. */
  exportList: (query: ReturnListQuery) => repository.download(query),
  detail: (id: string, signal?: AbortSignal) => repository.read("detail", { id }, returnView, signal),
  /** `customerId` is the profile chosen for a walk-in invoice; the API refuses it for an invoice that has a customer. */
  preview: (invoiceId: string, customerId?: string, signal?: AbortSignal) => repository.read("preview", { id: invoiceId, customerId }, returnPreview, signal),
  create: (invoiceId: string, body: CreateReturnBody) => repository.write("create", body, returnSaved, invoiceId),
  cancel: (id: string, body: CancelReturnBody) => repository.write("cancel", body, returnView, id),
};
