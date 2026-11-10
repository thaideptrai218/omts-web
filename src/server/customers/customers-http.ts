import "server-only";
import { z } from "zod";
import * as c from "@/features/customers/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

/**
 * The browser's door to the customer module: the profile (api/customers), its debt tab and adjustments (api/customer-debts), its
 * payments and QR codes (api/customer-payments) and the two lists shown on its tabs (sales invoices, purchase requests).
 * Each action names the backend call, the permission the account needs for it and the shape the answer must have.
 */
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CUSTOMERS = "CUSTOMERS", DEBTS = "CUSTOMER_DEBTS", PAYMENTS = "CUSTOMER_PAYMENTS";
const maxUploadBytes = 3 * 1024 * 1024;
const id = z.guid(), money = z.string().regex(/^-?\d{1,15}$/), day = z.iso.date();
const page = z.string().regex(/^[1-9]\d{0,6}$/);
const listParams = {
  search: z.string().max(200), type: z.enum(["Individual", "Company"]), gender: z.enum(["Male", "Female"]), birthdayFrom: day, birthdayTo: day, lastTransactionFrom: day, lastTransactionTo: day,
  totalSalesFrom: money, totalSalesTo: money, salesFrom: day, salesTo: day, currentDebtFrom: money, currentDebtTo: money, province: z.string().max(100), status: z.enum(["InUse", "Discontinued", "All"]),
  createdById: id, createdFrom: day, createdTo: day,
  sortBy: z.enum(["code", "name", "phone", "type", "province", "createdAt", "status", "totalSales", "netSales", "currentDebt", "lastTransaction"]), sortDir: z.enum(["asc", "desc"]),
};
const optionalList = Object.fromEntries(Object.entries(listParams).map(([key, schema]) => [key, schema.optional()])) as { [K in keyof typeof listParams]: z.ZodOptional<(typeof listParams)[K]> };
const paging = { page: page.optional(), pageSize: z.string().regex(/^[1-9]\d{0,2}$/).optional() };

const read = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list"), ...optionalList, ...paging }),
  z.strictObject({ action: z.literal("export"), ...optionalList }),
  z.strictObject({ action: z.literal("template") }),
  z.strictObject({ action: z.literal("detail"), id }),
  z.strictObject({ action: z.literal("merge-preview"), id, mergedCustomerId: id }),
  z.strictObject({ action: z.literal("invoices"), customerId: id, from: day, to: day, ...paging }),
  z.strictObject({ action: z.literal("requests"), customerId: id, ...paging }),
  z.strictObject({ action: z.literal("debt"), id, kinds: z.array(z.enum(c.entryKinds)).max(7).optional(), ...paging }),
  z.strictObject({ action: z.literal("debt-export"), customerId: id }),
  z.strictObject({ action: z.literal("payment-form"), customerId: id }),
  z.strictObject({ action: z.enum(["payment", "payment-qr"]), id }),
]);

const text = (max: number) => z.string().max(max).nullable().optional();
const saveBody = z.strictObject({
  name: z.string().max(200), phoneNumber: text(40), address: text(500), note: text(2000), rowVersion: z.string().min(1).max(200).optional(), code: z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional(),
  customerType: z.enum(["Individual", "Company"]).nullable().optional(), gender: z.enum(["Male", "Female"]).nullable().optional(), birthDate: day.nullable().optional(), phoneNumber2: text(40), email: text(256), facebook: text(300),
  province: text(100), ward: text(100), companyName: text(200), taxCode: text(20), identityNumber: text(20), bankBin: z.string().regex(/^\d{6}$/).nullable().optional(), bankAccountNumber: text(30),
});
const wholeMoney = z.number().int().max(9_999_999_999_999);
const paymentBody = z.strictObject({
  customerId: id, paymentDate: day.optional(), paidAt: z.iso.datetime({ offset: true }).optional(), amount: wholeMoney.min(0), method: z.enum(["Cash", "OtherTransfer"]).optional(), bankReference: text(100),
  collectedByAccountId: id.nullable().optional(), note: text(2000), code: z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional(), discountAmount: wholeMoney.min(0).optional(), cashAccountId: id.nullable().optional(),
  allocations: z.array(z.strictObject({ invoiceId: id, amount: wholeMoney.positive() })).max(300).optional(), confirmAboveDebt: z.boolean().optional(), confirmDuplicateBankReference: z.boolean().optional(),
  deduplicationKey: z.string().max(100).optional(),
});
const reason = z.string().trim().min(1).max(1000), rowVersion = z.string().min(1).max(200);
const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), body: saveBody }),
  z.strictObject({ action: z.literal("update"), id, body: saveBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.enum(["delete", "discontinue", "resume", "remove-photo"]), id }),
  z.strictObject({ action: z.literal("bulk"), body: z.strictObject({ ids: z.array(id).min(1).max(100), action: z.enum(["Discontinue", "Resume"]) }) }),
  z.strictObject({ action: z.literal("merge"), id, body: z.strictObject({ mergedCustomerId: id, keptRowVersion: rowVersion, mergedRowVersion: rowVersion, ownerApproved: z.boolean() }) }),
  z.strictObject({ action: z.enum(["pay", "pay-back", "pending-transfer"]), body: paymentBody }),
  z.strictObject({ action: z.literal("confirm-payment"), id }),
  z.strictObject({ action: z.literal("cancel-payment"), id, body: z.strictObject({ reason, rowVersion }) }),
  z.strictObject({ action: z.literal("adjust"), body: z.strictObject({ customerId: id, amount: wholeMoney.refine((value) => value !== 0), reason, occurredAt: z.iso.datetime({ offset: true }).optional() }) }),
  z.strictObject({ action: z.literal("cancel-adjustment"), id, body: z.strictObject({ reason, rowVersion: rowVersion.optional() }) }),
]);
const uploadQuery = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("import") }), z.strictObject({ action: z.literal("photo"), id })]);

type Plan = { path: string; method: "GET" | "POST" | "PUT" | "DELETE"; fn: string; permission: string; schema: z.ZodType; body?: unknown; file?: string; noContent?: boolean; expectedId?: string };
const pairs = (values: Record<string, unknown>, skip: readonly string[] = ["action", "id"]) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (skip.includes(key) || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  return params.size ? `?${params}` : "";
};
const noBody = z.never();

function planRead(q: z.infer<typeof read>): Plan {
  switch (q.action) {
    case "list": return { path: `/api/customers${pairs(q)}`, method: "GET", fn: CUSTOMERS, permission: "View", schema: c.customerPage };
    case "export": return { path: `/api/customers/export${pairs(q)}`, method: "GET", fn: CUSTOMERS, permission: "Export", schema: noBody, file: "khach-hang.xlsx" };
    case "template": return { path: "/api/customers/import/template", method: "GET", fn: CUSTOMERS, permission: "Create", schema: noBody, file: "mau-khach-hang.xlsx" };
    case "detail": return { path: `/api/customers/${q.id}`, method: "GET", fn: CUSTOMERS, permission: "View", schema: c.customerDetail, expectedId: q.id };
    case "merge-preview": return { path: `/api/customers/${q.id}/merge-preview?mergedCustomerId=${q.mergedCustomerId}`, method: "GET", fn: CUSTOMERS, permission: "Edit", schema: c.mergePreview };
    case "invoices": return { path: `/api/sales-invoices${pairs(q)}`, method: "GET", fn: "SALES_INVOICES", permission: "View", schema: c.invoicePage };
    case "requests": return { path: `/api/purchase-requests${pairs(q)}`, method: "GET", fn: "PURCHASE_REQUESTS", permission: "View", schema: c.requestPage };
    case "debt": return { path: `/api/customer-debts/${q.id}${pairs(q)}`, method: "GET", fn: DEBTS, permission: "View", schema: c.debtTab };
    case "debt-export": return { path: `/api/customer-debts/export?customerId=${q.customerId}`, method: "GET", fn: DEBTS, permission: "Export", schema: noBody, file: "cong-no-khach-hang.xlsx" };
    case "payment-form": return { path: `/api/customer-payments/form/${q.customerId}`, method: "GET", fn: PAYMENTS, permission: "View", schema: c.paymentForm };
    case "payment": return { path: `/api/customer-payments/${q.id}`, method: "GET", fn: PAYMENTS, permission: "View", schema: c.paymentDetails, expectedId: q.id };
    case "payment-qr": return { path: `/api/customer-payments/${q.id}/qr`, method: "GET", fn: PAYMENTS, permission: "View", schema: c.qrView };
  }
}
function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "create": return { path: "/api/customers", method: "POST", fn: CUSTOMERS, permission: "Create", schema: c.customerSaved, body: p.body };
    case "update": return { path: `/api/customers/${p.id}`, method: "PUT", fn: CUSTOMERS, permission: "Edit", schema: c.customerSaved, body: p.body };
    case "delete": return { path: `/api/customers/${p.id}`, method: "DELETE", fn: CUSTOMERS, permission: "Delete", schema: c.removed, noContent: true };
    case "discontinue":
    case "resume": return { path: `/api/customers/${p.id}/${p.action}`, method: "POST", fn: CUSTOMERS, permission: "Edit", schema: c.customerDetail, expectedId: p.id };
    case "remove-photo": return { path: `/api/customers/${p.id}/photo`, method: "DELETE", fn: CUSTOMERS, permission: "Edit", schema: c.customerDetail, expectedId: p.id };
    case "bulk": return { path: "/api/customers/bulk", method: "POST", fn: CUSTOMERS, permission: "Edit", schema: c.bulkResult, body: p.body };
    case "merge": return { path: `/api/customers/${p.id}/merge`, method: "POST", fn: CUSTOMERS, permission: "Edit", schema: c.customerDetail, body: p.body };
    case "pay": return { path: "/api/customer-payments", method: "POST", fn: PAYMENTS, permission: "Create", schema: c.paymentSaved, body: p.body };
    case "pay-back": return { path: "/api/customer-payments/pay-back", method: "POST", fn: PAYMENTS, permission: "Create", schema: c.paymentSaved, body: p.body };
    case "pending-transfer": return { path: "/api/customer-payments/pending-transfer", method: "POST", fn: PAYMENTS, permission: "Create", schema: c.paymentSaved, body: p.body };
    case "confirm-payment": return { path: `/api/customer-payments/${p.id}/confirm`, method: "POST", fn: PAYMENTS, permission: "Edit", schema: c.paymentSaved };
    case "cancel-payment": return { path: `/api/customer-payments/${p.id}/cancel`, method: "POST", fn: PAYMENTS, permission: "Edit", schema: c.paymentSaved, body: p.body };
    case "adjust": return { path: "/api/customer-debts/adjustments", method: "POST", fn: PAYMENTS, permission: "Edit", schema: c.adjustmentSaved, body: p.body };
    case "cancel-adjustment": return { path: `/api/customer-debts/adjustments/${p.id}/cancel`, method: "POST", fn: PAYMENTS, permission: "Edit", schema: c.adjustmentSaved, body: p.body };
  }
}

/** The allow-listed part of a problem answer that tells the form what to fix; nothing else of it reaches the browser. */
function projectProblem(data: unknown): c.Problem | undefined {
  return c.problemExtras.safeParse(data).data;
}

export async function handleCustomers(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let plan: Plan, outgoing: BodyInit | undefined, contentType: string | undefined;
    const query = new URL(request.url).searchParams;
    if (request.method === "GET") {
      const values: Record<string, string | string[]> = {};
      for (const key of new Set(query.keys())) values[key] = key === "kinds" ? query.getAll(key) : query.getAll(key).length === 1 ? query.get(key)! : "";
      const parsed = read.safeParse(values);
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = planRead(parsed.data);
    } else if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      if (/^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") ?? "")) {
        const check = csrf.guard.checkHeaders(request, "POST");
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const target = uploadQuery.safeParse(Object.fromEntries(query));
        if (!target.success || new Set(query.keys()).size !== query.size) return json({ status: "invalid-input", code: "MSG01" }, 400);
        if (Number(request.headers.get("content-length") ?? 0) > maxUploadBytes) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const bytes = await readBoundedBytes(request.body, request.signal, maxUploadBytes, 20_000);
        const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
        const entry = form.get("file");
        if (!(entry instanceof File) || [...form.keys()].length !== 1) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const upstream = new FormData();
        upstream.append("file", entry, entry.name);
        outgoing = upstream;
        plan = target.data.action === "import"
          ? { path: "/api/customers/import", method: "POST", fn: CUSTOMERS, permission: "Create", schema: c.importResult }
          : { path: `/api/customers/${target.data.id}/photo`, method: "PUT", fn: CUSTOMERS, permission: "Edit", schema: c.customerDetail, expectedId: target.data.id };
      } else {
        const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const parsed = write.safeParse(check.body.readForValidation());
        if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
        plan = planWrite(parsed.data);
        if (plan.body !== undefined) { outgoing = JSON.stringify(plan.body); contentType = "application/json"; }
      }
    } else return json({ status: "invalid-input" }, 405);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context;
    const allowed = identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && permissions.functionPermissions.some((p) => p.functionCode === plan.fn && p.action === plan.permission);
    if (!allowed) return json({ status: "forbidden", code: "MSG02" }, 403);

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
    if (plan.noContent && response.status === 204) return (await sameSession()) ? json({ status: "success", data: { done: true } }) : json({ status: "session-expired" }, 401);
    const copy = response.ok ? undefined : response.clone();
    const result = await readBackendResponse(response, "profileRead", true);
    if (!(await sameSession())) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") {
      const problem = copy ? projectProblem(await copy.json().catch(() => undefined)) : undefined;
      return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}) }, result.httpStatus);
    }
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = plan.schema.safeParse(result.data);
    if (!value.success || plan.expectedId && (value.data as { id?: string }).id !== plan.expectedId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
