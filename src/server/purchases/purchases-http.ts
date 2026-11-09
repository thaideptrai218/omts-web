import "server-only";
import { z } from "zod";
import * as c from "@/features/purchase-documents/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const many = <T extends z.ZodType>(value: T) => z.union([value, z.array(value).max(20)]).optional();
const sort = { sortBy: z.enum(["code", "date", "supplier", "total", "status"]).optional(), sortDir: z.enum(["asc", "desc"]).optional() };
const period = { from: z.iso.date().optional(), to: z.iso.date().optional(), search: z.string().max(200).optional(), supplierId: z.guid().optional(), statusIds: many(z.enum(["1701", "1702", "1703", "1901", "1902", "1903"])), zoneIds: many(z.guid()) };
const paging = { page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["15", "30", "50"]).optional() };
const receiptFilters = { ...period, ...sort, itemGroups: many(z.enum(["Seed", "Material", "Other"])), raftId: z.guid().optional() };
const returnFilters = { ...period, ...sort, source: z.enum(["receipt", "standalone"]).optional() };
const read = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("receipts"), ...receiptFilters, ...paging }),
  z.strictObject({ action: z.literal("receipts-export"), ...receiptFilters }),
  z.strictObject({ action: z.enum(["receipt", "receipt-payments", "cancel-preview", "copy", "return"]), id: z.guid() }),
  z.strictObject({ action: z.enum(["rafts", "receivers", "payers"]) }),
  z.strictObject({ action: z.enum(["payment", "supplier-debt"]), id: z.guid() }),
  z.strictObject({ action: z.literal("raft-costs"), raftId: z.guid(), from: z.iso.date().optional(), to: z.iso.date().optional() }),
  z.strictObject({ action: z.literal("returns"), ...returnFilters, ...paging }),
  z.strictObject({ action: z.literal("returns-export"), ...returnFilters }),
]);
const money = z.number().int().nonnegative().max(1e13);
/** A code the user typed for a document; null lets the API generate one. */
const documentCode = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable();
const refund = z.strictObject({ amount: money, method: z.enum(["Cash", "BankTransfer"]), bankReference: z.string().max(100).nullable() });
const receiptBody = z.strictObject({
  code: documentCode, supplierId: z.guid().nullable(), receiptDate: z.iso.date().nullable(), receivedAt: z.iso.datetime({ offset: true }).nullable(), receivedById: z.guid().nullable(), notes: z.string().max(2000).nullable(), discount: money, zoneId: z.guid().nullable(), complete: z.boolean(), rowVersion: z.string().max(200).nullable(),
  lines: z.array(z.strictObject({ lineId: z.guid().nullable(), itemId: z.guid().nullable(), quantity: z.number().positive().nullable(), unitPrice: money.nullable(), discount: money, supplierLotCode: z.string().max(50).nullable(), raftId: z.guid().nullable() })).max(200),
});
const returnBody = z.strictObject({
  code: documentCode, receiptId: z.guid().nullable(), returnedAt: z.iso.datetime({ offset: true }).nullable(), supplierId: z.guid().nullable(), zoneId: z.guid().nullable(), reason: z.string().max(2000), discount: money, ownerApproved: z.boolean(), complete: z.boolean(),
  refund: refund.nullable(), rowVersion: z.string().max(200).nullable(),
  lines: z.array(z.strictObject({ receiptLineId: z.guid().nullable(), itemId: z.guid().nullable(), unitPrice: money.nullable(), quantity: z.number().positive() })).max(200),
});
const reason = z.strictObject({ reason: z.string().trim().min(1).max(1000), rowVersion: z.string().max(200).nullable() });
const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("save-receipt"), id: z.guid().optional(), body: receiptBody }),
  z.strictObject({ action: z.literal("remove-receipt"), id: z.guid() }),
  z.strictObject({ action: z.literal("cancel-receipt"), id: z.guid(), body: reason }),
  z.strictObject({ action: z.literal("save-return"), id: z.guid().optional(), body: returnBody }),
  z.strictObject({ action: z.literal("remove-return"), id: z.guid() }),
  z.strictObject({ action: z.literal("cancel-return"), id: z.guid(), body: reason }),
  z.strictObject({ action: z.literal("create-payment"), body: z.strictObject({ code: documentCode, supplierId: z.guid(), kind: z.literal("Payment"), paidAt: z.iso.datetime({ offset: true }), paidById: z.guid().nullable(), amount: money, discountAmount: money,
    method: c.paymentMethods, bankReference: z.string().max(100).nullable(), note: z.string().max(2000).nullable(), confirmAdvance: z.boolean(), confirmDuplicateBankReference: z.boolean(), deduplicationKey: z.string().min(1).max(100),
    allocations: z.array(z.strictObject({ receiptId: z.guid(), amount: money.positive() })).max(200).nullable() }) }),
  z.strictObject({ action: z.literal("edit-payment"), id: z.guid(), body: z.strictObject({ rowVersion: z.string().min(1).max(200), paidAt: z.iso.datetime({ offset: true }), paidById: z.guid().nullable(), method: c.paymentMethods,
    bankReference: z.string().max(100).nullable(), note: z.string().max(2000).nullable(), confirmDuplicateBankReference: z.boolean() }) }),
  z.strictObject({ action: z.literal("cancel-payment"), id: z.guid(), body: reason }),
]);
type Plan = { path: string; method: string; permission: string; fn?: string; schema: z.ZodType; body?: unknown; file?: string; owner?: boolean; noContent?: boolean };
const R = "/api/purchase-receipts", T = "/api/purchase-returns";

function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (key === "action" || key === "id" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key[0].toUpperCase() + key.slice(1), String(item));
  }
  return params.size ? `?${params}` : "";
}

function planRead(q: z.infer<typeof read>): Plan {
  switch (q.action) {
    case "receipts": return { path: R + query(q), method: "GET", permission: "View", schema: c.receiptSearch };
    case "receipts-export": return { path: `${R}/export${query(q)}`, method: "GET", permission: "Export", schema: z.never(), file: "nhap-hang.xlsx" };
    case "receipt": return { path: `${R}/${q.id}`, method: "GET", permission: "View", schema: c.receiptView };
    case "receipt-payments": return { path: `${R}/${q.id}/payments`, method: "GET", permission: "View", schema: c.receiptPayments };
    case "cancel-preview": return { path: `${R}/${q.id}/cancel-preview`, method: "GET", permission: "Delete", schema: c.cancelPreview };
    case "copy": return { path: `${R}/${q.id}/copy`, method: "GET", permission: "Create", schema: c.receiptCopy };
    case "rafts": return { path: `${R}/raft-lookup`, method: "GET", permission: "View", schema: c.raftLookup };
    case "receivers": return { path: `${R}/receivers`, method: "GET", permission: "View", schema: c.receivers };
    case "payers": return { path: "/api/supplier-payments/payers", method: "GET", permission: "View", fn: "SUPPLIER_PAYMENTS", schema: c.receivers };
    case "payment": return { path: `/api/supplier-payments/${q.id}`, method: "GET", permission: "View", fn: "SUPPLIER_PAYMENTS", schema: c.paymentView };
    case "supplier-debt": return { path: `/api/supplier-debts/${q.id}`, method: "GET", permission: "View", fn: "SUPPLIER_PAYMENTS", schema: c.supplierDebt };
    case "raft-costs": return { path: `${R}/raft-material-costs${query(q)}`, method: "GET", permission: "View", schema: c.raftCosts };
    case "returns": return { path: T + query(q), method: "GET", permission: "View", schema: c.returnSearch };
    case "returns-export": return { path: `${T}/export${query(q)}`, method: "GET", permission: "Export", schema: z.never(), file: "tra-hang-nhap.xlsx" };
    case "return": return { path: `${T}/${q.id}`, method: "GET", permission: "View", schema: c.returnView };
  }
}

function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "save-receipt": return { path: p.id ? `${R}/${p.id}` : R, method: p.id ? "PUT" : "POST", permission: p.id ? "Edit" : "Create", schema: c.receiptView, body: p.body };
    case "remove-receipt": return { path: `${R}/${p.id}`, method: "DELETE", permission: "Delete", schema: c.removed, noContent: true };
    case "cancel-receipt": return { path: `${R}/${p.id}/cancel`, method: "POST", permission: "Delete", schema: c.receiptView, body: p.body };
    case "save-return": return { path: p.id ? `${T}/${p.id}` : T, method: p.id ? "PUT" : "POST", permission: p.id ? "Edit" : "Create", schema: c.returnView, body: p.body };
    case "remove-return": return { path: `${T}/${p.id}`, method: "DELETE", permission: "Delete", schema: c.removed, noContent: true };
    case "cancel-return": return { path: `${T}/${p.id}/cancel`, method: "POST", permission: "Delete", schema: c.cancelledReturn, body: p.body, owner: true };
    case "create-payment": return { path: "/api/supplier-payments", method: "POST", permission: "Create", fn: "SUPPLIER_PAYMENTS", schema: c.paymentView, body: p.body };
    case "edit-payment": return { path: `/api/supplier-payments/${p.id}`, method: "PUT", permission: "Create", fn: "SUPPLIER_PAYMENTS", schema: c.paymentView, body: p.body };
    case "cancel-payment": return { path: `/api/supplier-payments/${p.id}/cancel`, method: "POST", permission: "Create", fn: "SUPPLIER_PAYMENTS", schema: c.paymentView, body: p.body };
  }
}

export async function handlePurchases(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let plan: Plan;
    if (request.method === "GET") {
      const search = new URL(request.url).searchParams, values: Record<string, string | string[]> = {};
      for (const key of new Set(search.keys())) { const all = search.getAll(key); values[key] = all.length > 1 ? all : all[0]; }
      const parsed = read.safeParse(values);
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = planRead(parsed.data);
    } else if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const parsed = write.safeParse(check.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = planWrite(parsed.data);
    } else return json({ status: "invalid-input" }, 405);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context, owner = identity.subjectType === "CooperativeOwner";
    const allowed = owner || !plan.owner && identity.subjectType === "Staff" && permissions.functionPermissions.some((p) => p.functionCode === (plan.fn ?? "PURCHASE_RECEIPTS") && p.action === plan.permission);
    if (!allowed) return json({ status: "forbidden", code: "MSG02" }, 403);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, cache: "no-store", credentials: "omit", redirect: "error", signal,
      body: plan.body === undefined ? undefined : JSON.stringify(plan.body),
      headers: { Accept: plan.file ? mime : "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(plan.body === undefined ? {} : { "Content-Type": "application/json" }) } });
    const sameSession = async () => { const current = await gateway.resolve(request.headers.get("cookie")); return current.status === "resolved" && sameEmployeeSession(initial.session, current.session); };
    if (plan.file && response.ok) {
      if (response.headers.get("content-type")?.split(";")[0] !== mime) return json({ status: "invalid-response" }, 502);
      const bytes = await readBoundedBytes(response.body, signal, 32 * 1024 * 1024, backend.config.timeoutMs);
      if (!(await sameSession())) return json({ status: "session-expired" }, 401);
      return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": mime, "Content-Disposition": `attachment; filename="${plan.file}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
    }
    if (plan.noContent && response.status === 204) return (await sameSession()) ? json({ status: "success", data: { done: true } }) : json({ status: "session-expired" }, 401);
    const result = await readBackendResponse(response, "profileRead", true);
    if (!(await sameSession())) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = plan.schema.safeParse(result.data);
    if (!value.success) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
