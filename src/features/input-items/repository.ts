import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { workspaceError } from "@/features/api-workspace/workspace-error";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { invoiceConfirmationSchema, type InvoiceConfirmation } from "@/features/sales-invoices/confirmation-problem";
import { messageCatalog } from "@/shared/messages/message-catalog";
import * as c from "./contracts";

/** A failed call, with the part of the problem that tells what to fix (field names, existing record, the API's own words). */
/** `confirmation` is a question of the API (409) the user answers by sending the same request again with the named flag. */
export type Failure = Extract<WorkspaceResult<never>, { status: "error" }> & { problem?: c.Problem; confirmation?: InvoiceConfirmation };
export type Result<T> = { status: "success"; data: T } | Failure;
export type Query = Record<string, string | undefined>;

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const failed = (httpStatus: number, code?: string, uncertain = false, problem?: c.Problem, confirmation?: InvoiceConfirmation): Failure => ({ status: "error", httpStatus, code, uncertain, ...(problem ? { problem } : {}), ...(confirmation ? { confirmation } : {}) });
const problemOf = (value: unknown) => c.problemExtras.safeParse(value).data;
function search(values: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.append(key, value);
  return params;
}

/** The calls of one BFF door: reads by action name, JSON actions, uploads and spreadsheet downloads, all answering the same `Result`. */
export function bffClient(endpoint: string) {
  async function read<T>(action: string, values: Query, schema: z.ZodType<T>, signal?: AbortSignal): Promise<Result<T>> {
    try {
      const response = await bffFetch(`${endpoint}?${search({ action, ...values })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
      const value = await response.json(), parsed = schema.safeParse(value.data);
      return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : failed(response.ok ? 502 : response.status, value.code, false, problemOf(value.problem));
    } catch { return failed(0); }
  }
  async function send<T>(init: RequestInit, schema: z.ZodType<T>, query = ""): Promise<Result<T>> {
    try {
      const response = await bffFetch(`${endpoint}${query}`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), ...init });
      const value = await response.json(), parsed = schema.safeParse(value.data);
      return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data }
        : failed(response.status, value.code, response.status === 401 || response.status >= 500 || response.ok, problemOf(value.problem), invoiceConfirmationSchema.safeParse(value.invoiceConfirmation).data);
    } catch { return failed(0, undefined, true); }
  }
  const json = <T,>(action: string, payload: Record<string, unknown>, schema: z.ZodType<T>) =>
    send({ headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify({ action, ...payload }) }, schema);
  function upload<T>(action: string, file: File, schema: z.ZodType<T>, id?: string) {
    const form = new FormData();
    form.append("file", file, file.name);
    return send({ headers: { "X-OMTS-Request": "web" }, body: form }, schema, `?${search({ action, id })}`);
  }
  async function download(action: string, values: Query, name: string): Promise<Result<true>> {
    try {
      const response = await bffFetch(`${endpoint}?${search({ action, ...values })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
      if (!response.ok) { const value = await response.json(); return failed(response.status, value.code); }
      if (!response.headers.get("content-type")?.startsWith(mime)) return failed(502);
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      return { status: "success", data: true };
    } catch { return failed(0); }
  }
  return { read, json, upload, download };
}
const { read, json, upload, download } = bffClient("/api/input-items");

/** The text of a failed call: the API's own sentence for a shortage, the message of the code when the web has one, otherwise the usual wording of the status. */
export function inputError(result: Failure) {
  if (result.code === "MSG-INPUT-01" && result.problem?.message) return result.problem.message;
  const own = result.code && Object.hasOwn(messageCatalog, result.code) ? messageCatalog[result.code as keyof typeof messageCatalog] : undefined;
  return own && !own.includes("{") ? own : workspaceError(result);
}
export const errorText = (result: Result<unknown>) => result.status === "success" ? undefined : inputError(result);

/** The failed save as one line: its message, then the fields the backend named. */
export function problemText(result: Failure) {
  const names = [...(result.problem?.fields ?? []), ...(result.problem?.field ? [result.problem.field] : [])].map((name) => c.fieldNames[name] ?? name.replace(/^Line (\d+) .*/, "Dòng $1"));
  return `${inputError(result)}${names.length && result.code !== "MSG-INPUT-01" ? ` Kiểm tra: ${[...new Set(names)].join(", ")}.` : ""}`;
}

export type ListQuery = Record<string, string>;
export type SaveBody = Record<string, unknown>;
export type MovementQuery = { from?: string; to?: string; kind?: string; includeReversals?: string; page?: string; pageSize?: string };

export const inputRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("items", values, c.itemPage, signal),
  all: (values: Query = {}, signal?: AbortSignal) => read("items-all", values, c.itemList, signal),
  detail: (id: string, signal?: AbortSignal) => read("item", { id }, c.itemView, signal),
  nextCode: (group: string, signal?: AbortSignal) => read("item-next-code", { group }, c.nextCode, signal),
  save: (body: SaveBody, id?: string) => json(id ? "item-update" : "item-create", { id, body }, c.itemView),
  setStatus: (action: "discontinue" | "resume", id: string) => json(`item-${action}`, { id }, c.itemView),
  remove: (id: string) => json("item-delete", { id }, c.removedItem),
  addPhoto: (id: string, file: File) => upload("photo", file, c.itemView, id),
  removePhoto: (id: string, photoId: string) => json("item-photo-remove", { id, photoId }, c.itemView),
  import: (file: File) => upload("import", file, c.importResult),
  exportList: (values: ListQuery) => download("items-export", values, "vat-tu-giong.xlsx"),
  template: () => download("items-template", {}, "mau-vat-tu-giong.xlsx"),
  movements: (id: string, values: MovementQuery, signal?: AbortSignal) => read("movements", { id, ...values }, c.movementPage, signal),
  exportMovements: (id: string, values: MovementQuery) => download("movements-export", { id, ...values }, "nhap-xuat.xlsx"),
  seedLots: (id: string, signal?: AbortSignal) => read("seed-lots", { id }, c.seedLots, signal),
  removeSeedLot: (id: string, lotId: string) => json("seed-lot-delete", { id, lotId }, c.removedItem),

  units: (signal?: AbortSignal) => read("units", {}, c.inputUnit.array(), signal),
  saveUnit: (name: string, id?: string, rowVersion?: string) => json(id ? "unit-update" : "unit-create", { id, body: id ? { name, rowVersion } : { name } }, c.inputUnit),
  removeUnit: (id: string) => json("unit-delete", { id }, c.removed),
  groups: (signal?: AbortSignal) => read("groups", {}, c.inputGroup.array(), signal),
  saveGroup: (name: string, id?: string, rowVersion?: string, parentId?: string | null) =>
    json(id ? "group-update" : "group-create", { id, body: id ? { name, rowVersion, parentId: parentId ?? null } : { name, ...(parentId ? { parentId } : {}) } }, c.inputGroup),
  removeGroup: (id: string) => json("group-delete", { id }, c.removed),
  reorderGroups: (ids: string[]) => json("group-reorder", { body: { ids } }, c.inputGroup.array()),
  issueTypes: (signal?: AbortSignal) => read("issue-types", {}, c.issueType.array(), signal),
  saveIssueType: (name: string, id?: string, rowVersion?: string) => json(id ? "issue-type-update" : "issue-type-create", { id, body: id ? { name, rowVersion } : { name } }, c.issueType),
  removeIssueType: (id: string) => json("issue-type-delete", { id }, c.removed),
  settings: (signal?: AbortSignal) => read("settings", {}, c.settings, signal),
  saveSettings: (body: { costMethod: "Fixed" | "Average"; allowNegativeQuantity: boolean; rowVersion: string }) => json("settings-update", { body }, c.settings),

  priceSetup: (receiptId: string, signal?: AbortSignal) => read("price-setup", { id: receiptId }, c.priceSetup, signal),
  savePriceSetup: (receiptId: string, items: { itemId: string; costPrice: number | null }[]) => json("price-setup-update", { id: receiptId, body: { items } }, c.priceSetup),
};

export const issueRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("issues", values, c.issuePage, signal),
  detail: (id: string, signal?: AbortSignal) => read("issue", { id }, c.issueView, signal),
  nextCode: (kind: c.IssueKind, signal?: AbortSignal) => read("issue-next-code", { kind }, c.nextCode, signal),
  receivers: (zoneId: string, signal?: AbortSignal) => read("issue-receivers", { zoneId }, c.receivers, signal),
  save: (body: SaveBody, id?: string) => json(id ? "issue-update" : "issue-create", { id, body }, c.issueView),
  complete: (id: string, rowVersion?: string) => json("issue-complete", { id, body: rowVersion ? { rowVersion } : {} }, c.issueView),
  cancel: (id: string, reason: string, rowVersion?: string) => json("issue-cancel", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.issueView),
  remove: (id: string) => json("issue-delete", { id }, c.removed),
  exportList: (values: ListQuery) => download("issues-export", values, "phieu-xuat.xlsx"),
};
