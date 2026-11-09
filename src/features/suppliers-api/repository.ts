import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { bulkResult, historyPage, importResult, supplierDetail, supplierPage, type SupplierDetail } from "./contracts";

export type SupplierQuery = Record<string, string>;
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const query = (values: SupplierQuery) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ""));

async function read<T>(values: SupplierQuery, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch(`/api/suppliers?${query(values)}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", code: value.code, httpStatus: response.status, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}

async function write<T>(init: RequestInit, schema: z.ZodType<T>): Promise<WorkspaceResult<T>> {
  try {
    const response = await bffFetch("/api/suppliers", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000), ...init });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success ? { status: "success", data: parsed.data }
      : { status: "error", code: value.code, httpStatus: response.status, uncertain: response.status === 401 || response.status >= 500 || response.ok, catalogueProblem: value.catalogueProblem };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}

const json = <T,>(payload: unknown, schema: z.ZodType<T>) => write({ headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(payload) }, schema);

export const supplierRepository = {
  list: (values: SupplierQuery, signal?: AbortSignal) => read({ action: "list", ...values }, supplierPage, signal),
  detail: (id: string, signal?: AbortSignal) => read({ action: "detail", id }, supplierDetail, signal),
  history: (id: string, page: number, pageSize: number, signal?: AbortSignal) => read({ action: "history", id, page: String(page), pageSize: String(pageSize) }, historyPage, signal),
  save: (body: Record<string, unknown>, id?: string): Promise<WorkspaceResult<SupplierDetail>> => json({ action: id ? "update" : "create", id, body }, supplierDetail),
  setStatus: (action: "discontinue" | "reactivate", id: string) => json({ action, id, body: {} }, supplierDetail),
  bulk: (action: "Discontinue" | "Resume", ids: string[]) => json({ action: "bulk-status", body: { ids, action } }, bulkResult),
  import(file: File) {
    const form = new FormData();
    form.append("file", file, file.name);
    return write({ headers: { "X-OMTS-Request": "web" }, body: form }, importResult);
  },
  async download(action: "export" | "template", values: SupplierQuery, name: string): Promise<WorkspaceResult<true>> {
    try {
      const response = await bffFetch(`/api/suppliers?${query({ action, ...values })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
      if (!response.ok) { const value = await response.json(); return { status: "error", httpStatus: response.status, code: value.code, uncertain: false }; }
      if (!response.headers.get("content-type")?.startsWith(mime)) return { status: "error", httpStatus: 502, uncertain: false };
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      return { status: "success", data: true };
    } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
  },
};
