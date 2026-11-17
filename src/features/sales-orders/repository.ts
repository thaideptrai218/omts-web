import { bffClient, errorText as inputErrorText, problemText as inputProblemText, type Failure, type ListQuery, type Result, type SaveBody } from "@/features/input-items/repository";
import * as c from "./contracts";

export type { Failure, Result };

const { read, json, download } = bffClient("/api/sales-orders");

/** The API's own sentence for the order rules (it names the order code, the product and the delivered quantity); otherwise the usual wording of the code. */
const own = (result: Failure) => result.code?.startsWith("MSG-ORDER-") && result.problem?.message ? result.problem.message : undefined;
export const errorText = (result: Result<unknown>) => result.status === "success" ? undefined : own(result) ?? inputErrorText(result);
export const problemText = (result: Failure) => own(result) ?? inputProblemText(result);

export const orderRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("orders", values, c.orderPage, signal),
  detail: (id: string, signal?: AbortSignal) => read("order", { id }, c.orderView, signal),
  byCode: (code: string, signal?: AbortSignal) => read("order-by-code", { code }, c.orderView, signal),
  nextCode: (signal?: AbortSignal) => read("order-next-code", {}, c.nextCode, signal),
  /** The form of an order made from a purchase request (Owner). */
  requestDraft: (requestId: string, signal?: AbortSignal) => read("order-request-draft", { id: requestId }, c.requestDraft, signal),
  create: (body: SaveBody) => json("order-create", { body }, c.orderSaved),
  update: (id: string, body: SaveBody) => json("order-update", { id, body }, c.orderSaved),
  finish: (id: string, rowVersion?: string) => json("order-finish", { id, body: rowVersion ? { rowVersion } : {} }, c.orderClosed),
  cancel: (id: string, reason: string, rowVersion?: string) => json("order-cancel", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.orderClosed),
  exportList: (values: ListQuery) => download("orders-export", values, "dat-hang.xlsx"),
  print: (id: string) => download("order-print", { id }, "dat-hang-in.xlsx"),
};
