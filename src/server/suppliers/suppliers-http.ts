import "server-only";
import { z } from "zod";
import { bulkResult, historyPage, importResult, supplierDetail, supplierPage } from "@/features/suppliers-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const maxUploadBytes = 3 * 1024 * 1024;
const money = z.string().regex(/^-?\d{1,15}$/).optional();
const listParams = {
  search: z.string().max(200).optional(), type: z.enum(["Seed", "Material", "Other"]).optional(), statusId: z.enum(["101", "102"]).optional(),
  totalPurchasedFrom: money, totalPurchasedTo: money, currentDebtFrom: money, currentDebtTo: money,
  purchaseFrom: z.iso.date().optional(), purchaseTo: z.iso.date().optional(),
  sortBy: z.enum(["name", "code", "phone", "type", "province", "createdAt", "status", "totalPurchased", "currentDebt"]).optional(), sortDir: z.enum(["asc", "desc"]).optional(),
};
const pageParams = { page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "15", "20", "30", "50", "100"]).optional() };
const getSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list"), ...listParams, ...pageParams }),
  z.strictObject({ action: z.literal("export"), ...listParams }),
  z.strictObject({ action: z.literal("template") }),
  z.strictObject({ action: z.literal("detail"), id: z.guid() }),
  z.strictObject({ action: z.literal("history"), id: z.guid(), ...pageParams }),
]);
const optionalText = z.string().max(2000).nullable().optional();
const saveBody = z.strictObject({ code: z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional(), name: z.string().max(200), supplierType: z.enum(["Seed", "Material", "Other"]).nullable(), phoneNumber: z.string().max(40), address: optionalText, email: optionalText,
  province: optionalText, ward: optionalText, note: optionalText, companyName: optionalText, taxCode: optionalText, identityNumber: optionalText, rowVersion: z.string().max(200).optional() });
const postSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), body: saveBody }),
  z.strictObject({ action: z.literal("update"), id: z.guid(), body: saveBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.enum(["discontinue", "reactivate"]), id: z.guid(), body: z.strictObject({}) }),
  z.strictObject({ action: z.literal("bulk-status"), body: z.strictObject({ ids: z.array(z.guid()).min(1).max(100), action: z.enum(["Discontinue", "Resume"]) }) }),
]);

export async function handleSuppliers(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const isUpload = request.method === "POST" && /^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") ?? "");
    let path = "/api/suppliers", method = "GET", fn = "SUPPLIERS", permission = "View", file = false, outgoing: BodyInit | undefined, contentType: string | undefined;
    let schema: z.ZodType = supplierPage, expectedId: string | undefined;
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      const parsed = getSchema.safeParse(Object.fromEntries(query));
      if (!parsed.success || new Set(query.keys()).size !== query.size) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const q = parsed.data, values = new URLSearchParams(query);
      values.delete("action"); values.delete("id");
      if (q.action === "export") { path += "/export"; permission = "Export"; file = true; }
      else if (q.action === "template") { path += "/import/template"; permission = "Create"; file = true; }
      else if (q.action === "detail") { path += `/${q.id}`; schema = supplierDetail; expectedId = q.id; }
      else if (q.action === "history") { path += `/${q.id}/history`; fn = "PURCHASE_RECEIPTS"; schema = historyPage; }
      if (values.size) path += `?${values}`;
    } else if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      if (isUpload) {
        const check = csrf.guard.checkHeaders(request, "POST");
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > maxUploadBytes) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const bytes = await readBoundedBytes(request.body, request.signal, maxUploadBytes, 20_000);
        const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
        const entry = form.get("file");
        if (!(entry instanceof File) || [...form.keys()].length !== 1) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const upstream = new FormData();
        upstream.append("file", entry, entry.name);
        outgoing = upstream; path += "/import"; method = "POST"; permission = "Create"; schema = importResult;
      } else {
        const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const parsed = postSchema.safeParse(check.body.readForValidation());
        if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const p = parsed.data;
        method = "POST"; schema = supplierDetail; contentType = "application/json"; outgoing = JSON.stringify(p.body);
        if (p.action === "create") permission = "Create";
        else if (p.action === "update") { path += `/${p.id}`; method = "PUT"; permission = "Edit"; expectedId = p.id; }
        else if (p.action === "bulk-status") { path += "/bulk-status"; permission = "Edit"; schema = bulkResult; }
        else { path += `/${p.id}/${p.action}`; permission = "Edit"; outgoing = undefined; contentType = undefined; expectedId = p.id; }
      }
    } else return json({ status: "invalid-input" }, 405);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context;
    const allowed = identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === permission);
    if (!allowed) return json({ status: "forbidden", code: "MSG02" }, 403);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(path, backend.config.origin), { method, body: outgoing, cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: file ? mime : "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(contentType ? { "Content-Type": contentType } : {}) } });
    if (file && response.ok) {
      if (response.headers.get("content-type")?.split(";")[0] !== mime) return json({ status: "invalid-response" }, 502);
      const bytes = await readBoundedBytes(response.body, signal, 32 * 1024 * 1024, backend.config.timeoutMs);
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": mime, "Content-Disposition": 'attachment; filename="suppliers.xlsx"', "Content-Security-Policy": "sandbox; default-src 'none'" } });
    }
    const result = await readBackendResponse(response, "profileRead", true);
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code, ...(result.catalogueProblem ? { catalogueProblem: result.catalogueProblem } : {}) }, result.httpStatus);
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = schema.safeParse(result.data);
    if (!value.success || expectedId && (value.data as { id?: string }).id !== expectedId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
