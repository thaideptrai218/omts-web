import "server-only";
import { z } from "zod";
import * as c from "@/features/cash-book/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const BOOK = "CASH_BOOK", SETTINGS = "CASH_BOOK_SETTINGS";
const filters = {
  fund: z.enum(["Cash", "Bank", "EWallet", "All"]).optional(), cashAccountId: z.guid().optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), direction: c.direction.optional(), typeId: z.guid().optional(),
  status: z.enum(["Recorded", "Cancelled"]).optional(), createdById: z.guid().optional(), partyKind: c.partyKind.optional(), party: z.string().max(200).optional(), countsInResult: z.enum(["true", "false"]).optional(),
  search: z.string().max(100).optional(), sort: z.enum(["code", "time", "amount"]).optional(), desc: z.enum(["true", "false"]).optional(),
};
const read = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("book"), ...filters, page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["15", "30", "50"]).optional() }),
  z.strictObject({ action: z.literal("export"), ...filters }),
  z.strictObject({ action: z.literal("voucher"), id: z.guid() }),
  z.strictObject({ action: z.literal("accounts"), kind: c.accountKind.optional(), includeInactive: z.enum(["true", "false"]).optional() }),
  z.strictObject({ action: z.literal("types"), direction: c.direction.optional() }),
  z.strictObject({ action: z.literal("parties"), kind: c.partyKind, search: z.string().max(100).optional() }),
  z.strictObject({ action: z.enum(["collectors", "banks"]) }),
]);
const money = z.number().int().positive().max(1e13);
const rowVersion = z.string().min(1).max(200);
const short = (max: number) => z.string().trim().max(max).nullable();
const voucherBody = z.strictObject({
  code: z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable(), direction: c.direction, fund: c.fund, cashAccountId: z.guid().nullable(), typeId: z.guid(), occurredAt: z.iso.datetime({ offset: true }), amount: money,
  collectorId: z.guid().nullable(), partyKind: c.partyKind.nullable(), partyId: z.guid().nullable(), partyName: short(200), note: short(2000), countsInResult: z.boolean(),
  // A voucher of a customer may count in the customer's debt: it is then saved as a customer payment, with its invoices when named.
  countInDebt: z.boolean().optional(), debtMode: z.enum(["AllocateToInvoices", "DebtOnly"]).optional(), debtAllocations: z.array(z.strictObject({ invoiceId: z.guid(), amount: money })).max(300).optional(),
});
const accountBody = z.strictObject({ kind: c.accountKind, bankBin: z.string().regex(/^\d{6}$/).nullable(), providerName: short(100), accountNumber: z.string().trim().min(1).max(30), holderName: z.string().trim().min(1).max(200), note: short(500) });
const typeBody = z.strictObject({ direction: c.direction, category: c.category, name: z.string().trim().min(1).max(100), description: short(500), countsInResult: z.boolean() });
const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("save-voucher"), id: z.guid().optional(), body: voucherBody.extend({ rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("cancel-voucher"), id: z.guid(), body: z.strictObject({ reason: short(1000), rowVersion }) }),
  z.strictObject({ action: z.literal("save-account"), id: z.guid().optional(), body: accountBody.extend({ isActive: z.boolean().optional(), rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("remove-account"), id: z.guid() }),
  z.strictObject({ action: z.literal("save-type"), id: z.guid().optional(), body: typeBody.extend({ rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("remove-type"), id: z.guid() }),
  z.strictObject({ action: z.literal("create-party"), body: z.strictObject({ name: z.string().trim().min(1).max(200), phoneNumber: short(20), address: short(500), area: short(100), ward: short(100), note: short(1000) }) }),
]);
type Plan = { path: string; method: string; fn: string; permission: string; schema: z.ZodType; body?: unknown; file?: string; noContent?: boolean; alsoBookView?: boolean };

function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (key !== "action" && key !== "id" && value !== undefined) params.append(key, String(value));
  return params.size ? `?${params}` : "";
}
function planRead(q: z.infer<typeof read>): Plan {
  switch (q.action) {
    case "book": return { path: `/api/cash-book${query(q)}`, method: "GET", fn: BOOK, permission: "View", schema: c.bookPage };
    case "export": return { path: `/api/cash-book/export${query(q)}`, method: "GET", fn: BOOK, permission: "Export", schema: z.never(), file: "so-quy.xlsx" };
    case "voucher": return { path: `/api/cash-book/vouchers/${q.id}`, method: "GET", fn: BOOK, permission: "View", schema: c.voucherView };
    // Pickers on the voucher form read the accounts and types with the cash book's own View right.
    case "accounts": return { path: `/api/cash-accounts${query(q)}`, method: "GET", fn: SETTINGS, permission: "View", schema: c.cashAccounts, alsoBookView: true };
    case "types": return { path: `/api/cash-voucher-types${query(q)}`, method: "GET", fn: SETTINGS, permission: "View", schema: c.voucherTypes, alsoBookView: true };
    case "parties": return { path: `/api/cash-book/parties${query(q)}`, method: "GET", fn: BOOK, permission: "View", schema: c.parties };
    case "collectors": return { path: "/api/cash-book/collectors", method: "GET", fn: BOOK, permission: "View", schema: c.people };
    case "banks": return { path: "/api/cash-accounts/banks", method: "GET", fn: SETTINGS, permission: "View", schema: c.banks };
  }
}
function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "save-voucher": return { path: p.id ? `/api/cash-book/vouchers/${p.id}` : "/api/cash-book/vouchers", method: p.id ? "PUT" : "POST", fn: BOOK, permission: p.id ? "Edit" : "Create", schema: c.voucherView, body: p.body };
    case "cancel-voucher": return { path: `/api/cash-book/vouchers/${p.id}/cancel`, method: "POST", fn: BOOK, permission: "Delete", schema: c.voucherView, body: p.body };
    case "save-account": return { path: p.id ? `/api/cash-accounts/${p.id}` : "/api/cash-accounts", method: p.id ? "PUT" : "POST", fn: SETTINGS, permission: "Edit", schema: c.cashAccount, body: p.body };
    case "remove-account": return { path: `/api/cash-accounts/${p.id}`, method: "DELETE", fn: SETTINGS, permission: "Edit", schema: z.union([c.cashAccount, c.removed]), noContent: true };
    case "save-type": return { path: p.id ? `/api/cash-voucher-types/${p.id}` : "/api/cash-voucher-types", method: p.id ? "PUT" : "POST", fn: SETTINGS, permission: "Edit", schema: c.voucherType, body: p.body };
    case "remove-type": return { path: `/api/cash-voucher-types/${p.id}`, method: "DELETE", fn: SETTINGS, permission: "Edit", schema: c.removed, noContent: true };
    case "create-party": return { path: "/api/cash-book/parties", method: "POST", fn: BOOK, permission: "Create", schema: c.party, body: p.body };
  }
}

export async function handleCashBook(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let plan: Plan;
    if (request.method === "GET") {
      const search = new URL(request.url).searchParams, values: Record<string, string> = {};
      for (const key of new Set(search.keys())) values[key] = search.get(key) ?? "";
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
    const holds = (fn: string, action: string) => permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
    const allowed = owner || identity.subjectType === "Staff" && (holds(plan.fn, plan.permission) || plan.alsoBookView === true && holds(BOOK, "View"));
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
