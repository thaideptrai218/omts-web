import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { messageCatalog } from "@/shared/messages/message-catalog";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import * as c from "./contracts";

/** A failed call, with the part of the problem that tells what to fix (field names, existing record, what to offer instead). */
export type Failure = Extract<WorkspaceResult<never>, { status: "error" }> & { problem?: c.Problem };
export type Result<T> = { status: "success"; data: T } | Failure;
export type Query = Record<string, string | readonly string[] | undefined>;

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const failed = (httpStatus: number, code?: string, uncertain = false, problem?: c.Problem): Failure => ({ status: "error", httpStatus, code, uncertain, ...(problem ? { problem } : {}) });
function search(values: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) if (item) params.append(key, item);
  return params;
}
const problemOf = (value: unknown) => c.problemExtras.safeParse(value).data;

async function read<T>(values: Query, schema: z.ZodType<T>, signal?: AbortSignal): Promise<Result<T>> {
  try {
    const response = await bffFetch(`/api/customers?${search(values)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.ok ? 502 : response.status, value.code, false, problemOf(value.problem));
  } catch { return failed(0); }
}
async function send<T>(init: RequestInit, schema: z.ZodType<T>, query = ""): Promise<Result<T>> {
  try {
    const response = await bffFetch(`/api/customers${query}`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), ...init });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data }
      : failed(response.status, value.code, response.status === 401 || response.status >= 500 || response.ok, problemOf(value.problem));
  } catch { return failed(0, undefined, true); }
}
const json = <T,>(action: string, payload: { id?: string; body?: unknown }, schema: z.ZodType<T>) =>
  send({ headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify({ action, ...payload }) }, schema);
function upload<T>(action: "import" | "photo", file: File, schema: z.ZodType<T>, id?: string) {
  const form = new FormData();
  form.append("file", file, file.name);
  return send({ headers: { "X-OMTS-Request": "web" }, body: form }, schema, `?${search({ action, id })}`);
}
async function download(values: Query, name: string): Promise<Result<true>> {
  try {
    const response = await bffFetch(`/api/customers?${search(values)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) { const value = await response.json(); return failed(response.status, value.code); }
    if (!response.headers.get("content-type")?.startsWith(mime)) return failed(502);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { status: "success", data: true };
  } catch { return failed(0); }
}

/** The text of a failed call: the message of the code when the web has one for it, otherwise the usual wording of the status. */
export function customerError(result: Failure) {
  const own = result.code && Object.hasOwn(messageCatalog, result.code) ? messageCatalog[result.code as keyof typeof messageCatalog] : undefined;
  return own && !own.includes("{") ? own : workspaceError(result);
}
export const errorText = (result: Result<unknown>) => result.status === "success" ? undefined : customerError(result);

export type ListQuery = Record<string, string>;
export type SaveBody = Record<string, unknown>;

export const customerRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read({ action: "list", ...values }, c.customerPage, signal),
  detail: (id: string, signal?: AbortSignal) => read({ action: "detail", id }, c.customerDetail, signal),
  save: (body: SaveBody, id?: string) => json(id ? "update" : "create", { id, body }, c.customerSaved),
  remove: (id: string) => json("delete", { id }, c.removed),
  setStatus: (action: "discontinue" | "resume", id: string) => json(action, { id }, c.customerDetail),
  bulk: (action: "Discontinue" | "Resume", ids: string[]) => json("bulk", { body: { ids, action } }, c.bulkResult),
  mergePreview: (id: string, mergedCustomerId: string, signal?: AbortSignal) => read({ action: "merge-preview", id, mergedCustomerId }, c.mergePreview, signal),
  merge: (id: string, body: { mergedCustomerId: string; keptRowVersion: string; mergedRowVersion: string; ownerApproved: boolean }) => json("merge", { id, body }, c.customerDetail),
  setPhoto: (id: string, file: File) => upload("photo", file, c.customerDetail, id),
  removePhoto: (id: string) => json("remove-photo", { id }, c.customerDetail),
  import: (file: File) => upload("import", file, c.importResult),
  exportList: (values: ListQuery) => download({ action: "export", ...values }, "khach-hang.xlsx"),
  template: () => download({ action: "template" }, "mau-khach-hang.xlsx"),

  invoices: (values: { customerId: string; from: string; to: string; page: number; pageSize: number }, signal?: AbortSignal) =>
    read({ action: "invoices", customerId: values.customerId, from: values.from, to: values.to, page: String(values.page), pageSize: String(values.pageSize) }, c.invoicePage, signal),
  requests: (customerId: string, page: number, pageSize: number, signal?: AbortSignal) => read({ action: "requests", customerId, page: String(page), pageSize: String(pageSize) }, c.requestPage, signal),
  debt: (customerId: string, values: { kinds: readonly string[]; page: number; pageSize: number }, signal?: AbortSignal) =>
    read({ action: "debt", id: customerId, kinds: values.kinds, page: String(values.page), pageSize: String(values.pageSize) }, c.debtTab, signal),
  exportDebt: (customerId: string) => download({ action: "debt-export", customerId }, "cong-no-khach-hang.xlsx"),

  paymentForm: (customerId: string, signal?: AbortSignal) => read({ action: "payment-form", customerId }, c.paymentForm, signal),
  payment: (id: string, signal?: AbortSignal) => read({ action: "payment", id }, c.paymentDetails, signal),
  paymentQr: (id: string, signal?: AbortSignal) => read({ action: "payment-qr", id }, c.qrView, signal),
  pay: (body: PaymentBody) => json("pay", { body }, c.paymentSaved),
  payBack: (body: PaymentBody) => json("pay-back", { body }, c.paymentSaved),
  pendingTransfer: (body: PaymentBody) => json("pending-transfer", { body }, c.paymentSaved),
  confirmPayment: (id: string) => json("confirm-payment", { id }, c.paymentSaved),
  cancelPayment: (id: string, reason: string, rowVersion: string) => json("cancel-payment", { id, body: { reason, rowVersion } }, c.paymentSaved),
  adjust: (body: { customerId: string; amount: number; reason: string; occurredAt: string }) => json("adjust", { body }, c.adjustmentSaved),
  cancelAdjustment: (id: string, reason: string, rowVersion?: string | null) => json("cancel-adjustment", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.adjustmentSaved),
};

export type PaymentBody = {
  customerId: string; paymentDate?: string; paidAt?: string; amount: number; method?: "Cash" | "OtherTransfer"; bankReference?: string | null; collectedByAccountId?: string | null; note?: string | null; code?: string | null;
  discountAmount?: number; cashAccountId?: string | null; allocations?: { invoiceId: string; amount: number }[]; confirmAboveDebt?: boolean; confirmDuplicateBankReference?: boolean; deduplicationKey?: string;
};
