import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-orders/contracts";
import { problemExtras } from "@/features/input-items/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

/**
 * The browser's door to Đặt hàng (api/sales-orders): the list, one order by id or by code, the form of an order made from a purchase request, the next code,
 * the spreadsheet exports, and the writes (save, update, finish, cancel); the advance of "Khách thanh toán" travels inside the save. Each action names the backend call, who may make it and the shape the
 * answer must have; query values are forwarded only for the names an action lists.
 */
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const id = z.guid(), reason = z.string().trim().min(1).max(1000), rowVersion = z.string().min(1).max(200);
const code = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional();
const text = (max: number) => z.string().max(max).nullable().optional();
const money = z.number().int().min(0).max(1e12);
const instant = z.iso.datetime({ offset: true }).nullable().optional();

/** Who may make a call: the Owner always; a staff account when it holds any of the listed function permissions; `owner` allows only the Owner. */
type Access = { owner: true } | { any: readonly (readonly [string, string])[] };
const orders = (action: string): Access => ({ any: [["SALES_ORDERS", action]] });
const ownerOnly: Access = { owner: true };

const listFilters = ["search", "from", "to", "pickupFrom", "pickupTo", "customerId", "source", "createdById", "receivedById", "sortBy", "sortDir"] as const;
const paging = ["page", "pageSize"] as const;
const guidFilters = ["customerId", "createdById", "receivedById"];
const dateFilters = ["from", "to", "pickupFrom", "pickupTo"];
const statusIds = new Set(["4101", "4102", "4103", "4104"]);
const codePattern = /^[A-Za-z0-9._-]{1,30}$/;

type Query = Record<string, string>;
type Plan = { path: string; method: "GET" | "POST" | "PUT"; access: Access; schema: z.ZodType; body?: unknown; file?: string; expectedId?: string };
/** The listed names are forwarded as they are; `statusIds` is a comma list on the web side and repeats as a parameter for the API. */
function forward(query: Query, names: readonly string[]) {
  const params = new URLSearchParams();
  for (const name of names) if (query[name]) params.append(name, query[name]);
  if (query.statusIds) for (const value of query.statusIds.split(",")) params.append("statusIds", value);
  return params.size ? `?${params}` : "";
}
const guid = (value: string | undefined) => id.safeParse(value).success ? value! : undefined;
const noBody = z.never();
const S = "/api/sales-orders";

type Read = (q: Query, ref: { id?: string }) => Plan;
const reads: Record<string, Read> = {
  orders: (q) => ({ path: `${S}${forward(q, [...listFilters, ...paging])}`, method: "GET", access: orders("View"), schema: c.orderPage }),
  "orders-export": (q) => ({ path: `${S}/export${forward(q, listFilters)}`, method: "GET", access: orders("Export"), schema: noBody, file: "dat-hang.xlsx" }),
  "order-next-code": () => ({ path: `${S}/next-code`, method: "GET", access: orders("Create"), schema: c.nextCode }),
  order: (_q, ref) => ({ path: `${S}/${ref.id}`, method: "GET", access: orders("View"), schema: c.orderView, expectedId: ref.id }),
  "order-by-code": (q) => ({ path: `${S}/by-code/${encodeURIComponent(q.code)}`, method: "GET", access: orders("View"), schema: c.orderView }),
  "order-request-draft": (_q, ref) => ({ path: `${S}/request-draft/${ref.id}`, method: "GET", access: ownerOnly, schema: c.requestDraft }),
  "order-print": (_q, ref) => ({ path: `${S}/${ref.id}/print`, method: "GET", access: orders("Export"), schema: noBody, file: "dat-hang-in.xlsx" }),
};
/** The reads that need the id of a record. */
const needsId = new Set(["order", "order-request-draft", "order-print"]);

const lineBody = z.strictObject({ productId: id, unitId: id, quantity: z.number().positive().max(1e9), unitPrice: money.nullable().optional(), priceDecidedByOwner: z.boolean().optional(), note: text(500) });
const advanceBody = z.strictObject({
  amount: z.number().int().positive().max(1e12), method: z.enum(c.advanceMethods), cashAccountId: id.nullable().optional(), bankReference: text(100),
  collectedById: id.nullable().optional(), paidAt: instant, note: text(500), confirmDuplicateBankReference: z.boolean().optional(),
});
const orderBody = z.strictObject({
  code, customerId: id.nullable().optional(), walkInCustomer: z.boolean(), purchaseRequestId: id.nullable().optional(), source: z.enum(c.orderSources), receivedById: id.nullable().optional(),
  orderedAt: instant, pickupAt: instant, note: text(1000), discount: money, discountDecidedByOwner: z.boolean().optional(), lines: z.array(lineBody).min(1).max(100),
  advance: advanceBody.nullable().optional(), deduplicationKey: text(100), rowVersion: rowVersion.optional(),
});
const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("order-create"), body: orderBody }),
  z.strictObject({ action: z.literal("order-update"), id, body: orderBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.literal("order-finish"), id, body: z.strictObject({ rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("order-cancel"), id, body: z.strictObject({ reason, rowVersion: rowVersion.optional() }) }),
]);

function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "order-create": return { path: S, method: "POST", access: orders("Create"), schema: c.orderSaved, body: p.body };
    case "order-update": return { path: `${S}/${p.id}`, method: "PUT", access: orders("Edit"), schema: c.orderSaved, body: p.body, expectedId: p.id };
    case "order-finish": return { path: `${S}/${p.id}/finish`, method: "POST", access: orders("Edit"), schema: c.orderClosed, body: p.body };
    case "order-cancel": return { path: `${S}/${p.id}/cancel`, method: "POST", access: orders("Delete"), schema: c.orderClosed, body: p.body };
  }
}

/** The id of the order an answer is about: a read answers the order, a save answers `{ order }`. */
const answeredId = (data: unknown) => (data as { order?: { id?: string }; id?: string }).order?.id ?? (data as { id?: string }).id;
const readQuery = z.record(z.string().max(60), z.string().max(200));

/** The allow-listed part of a problem answer that tells the form what to fix; nothing else of it reaches the browser. */
const projectProblem = (data: unknown) => problemExtras.safeParse(data).data;
const allowed = (access: Access, identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) =>
  identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && "any" in access && access.any.some(([fn, action]) => functions.some((p) => p.functionCode === fn && p.action === action));

const invalid = (json: (body: unknown, status?: number) => Response) => json({ status: "invalid-input", code: "MSG01" }, 400);

export async function handleSalesOrders(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let plan: Plan, outgoing: BodyInit | undefined, contentType: string | undefined;
    const query = new URL(request.url).searchParams;
    if (request.method === "GET") {
      const values: Query = {};
      for (const key of new Set(query.keys())) { if (query.getAll(key).length !== 1) return invalid(json); values[key] = query.get(key)!; }
      const parsed = readQuery.safeParse(values);
      const { action, id: refId, ...rest } = parsed.success ? parsed.data : { action: "" } as Query;
      if (!parsed.success || !Object.hasOwn(reads, action)) return invalid(json);
      const ref = { id: guid(refId) };
      if (refId && !ref.id || needsId.has(action) && !ref.id) return invalid(json);
      if (action === "order-by-code" && !codePattern.test(rest.code ?? "")) return invalid(json);
      for (const name of guidFilters) if (rest[name] && !guid(rest[name])) return invalid(json);
      for (const name of dateFilters) if (rest[name] && !z.iso.date().safeParse(rest[name]).success) return invalid(json);
      if (rest.source && !(c.orderSources as readonly string[]).includes(rest.source)) return invalid(json);
      if (rest.statusIds && !rest.statusIds.split(",").every((value) => statusIds.has(value))) return invalid(json);
      plan = reads[action](rest, ref);
    } else if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const parsed = write.safeParse(check.body.readForValidation());
      if (!parsed.success) return invalid(json);
      plan = planWrite(parsed.data);
      outgoing = JSON.stringify(plan.body); contentType = "application/json";
    } else return json({ status: "invalid-input" }, 405);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context;
    if (!allowed(plan.access, identity, permissions.functionPermissions)) return json({ status: "forbidden", code: "MSG02" }, 403);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, body: outgoing, cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: plan.file ? mime : "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(contentType ? { "Content-Type": contentType } : {}) } });
    const sameSession = async () => { const current = await gateway.resolve(request.headers.get("cookie")); return current.status === "resolved" && sameEmployeeSession(initial.session, current.session); };
    if (plan.file && response.ok) {
      if (response.headers.get("content-type")?.split(";")[0] !== mime) return json({ status: "invalid-response" }, 502);
      const bytes = await readBoundedBytes(response.body, signal, 32 * 1024 * 1024, backend.config.timeoutMs);
      if (!(await sameSession())) return json({ status: "session-expired" }, 401);
      return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": mime, "Content-Disposition": `attachment; filename="${plan.file}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
    }
    const copy = response.ok ? undefined : response.clone();
    const result = await readBackendResponse(response, "profileRead", true, true);
    if (!(await sameSession())) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") {
      const problem = copy ? projectProblem(await copy.json().catch(() => undefined)) : undefined;
      return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}), ...(result.invoiceConfirmation ? { invoiceConfirmation: result.invoiceConfirmation } : {}) }, result.httpStatus);
    }
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = plan.schema.safeParse(result.data);
    if (!value.success || plan.expectedId && answeredId(value.data) !== plan.expectedId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
