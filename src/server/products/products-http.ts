import "server-only";
import { z } from "zod";
import * as c from "@/features/products/contracts";
import { problemExtras } from "@/features/input-items/contracts";
import { catalogueReaders, pickerReaders } from "@/features/products/product-permissions";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

/**
 * The browser's door to the Sản phẩm module: the product catalogue (api/products), its groups (api/product-categories), the movements, harvest lots
 * and price history of a product, and the product disposal documents (api/product-disposals). Each action names the backend call, who may make it
 * and the shape the answer must have; query values are forwarded only for the names an action lists.
 */
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const maxUploadBytes = 3 * 1024 * 1024;
const id = z.guid(), reason = z.string().trim().min(1).max(1000), rowVersion = z.string().min(1).max(200);
const code = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional();
const text = (max: number) => z.string().max(max).nullable().optional();
const nonNegative = z.number().min(0).max(1e9).nullable().optional();

/** Who may make a call: the Owner always; a staff account when it holds any of the listed function permissions; `owner` allows only the Owner. */
type Access = { owner: true } | { any: readonly (readonly [string, string])[] };
const ownerOnly: Access = { owner: true };
const catalogRead: Access = { any: catalogueReaders };
/** The plain list and detail of products also serve whoever records harvests, to pick the products of a lot. */
const pickerRead: Access = { any: pickerReaders };
const disposalAccess = (action: string): Access => ({ any: [["PRODUCT_DISPOSALS", action]] });

const productFilters = ["search", "categoryId", "stock", "status", "sortBy", "sortDir"] as const;
const disposalFilters = ["search", "status", "from", "to", "zoneId", "productId", "createdById", "sortBy", "sortDir"] as const;
const paging = ["page", "pageSize"] as const;

type Query = Record<string, string>;
type Plan = { path: string; method: "GET" | "POST" | "PUT" | "DELETE"; access: Access; schema: z.ZodType; body?: unknown; file?: string; noContent?: boolean; expectedId?: string };
const forward = (query: Query, names: readonly string[]) => {
  const params = new URLSearchParams();
  for (const name of names) if (query[name]) params.append(name, query[name]);
  return params.size ? `?${params}` : "";
};
const guid = (value: string | undefined) => id.safeParse(value).success ? value! : undefined;
const noBody = z.never();
const P = "/api/products", G = "/api/product-categories", D = "/api/product-disposals";

type Read = (q: Query, ref: { id?: string }) => Plan;
const reads: Record<string, Read> = {
  products: (q) => ({ path: `${P}/search${forward(q, [...productFilters, ...paging])}`, method: "GET", access: catalogRead, schema: c.productPage }),
  "products-all": (q) => ({ path: `${P}${forward(q, ["search"])}`, method: "GET", access: pickerRead, schema: z.array(c.productRow) }),
  "products-export": (q) => ({ path: `${P}/export${forward(q, productFilters)}`, method: "GET", access: catalogRead, schema: noBody, file: "san-pham.xlsx" }),
  "products-template": () => ({ path: `${P}/import/template`, method: "GET", access: ownerOnly, schema: noBody, file: "mau-san-pham.xlsx" }),
  "product-next-code": () => ({ path: `${P}/next-code`, method: "GET", access: ownerOnly, schema: c.nextCode }),
  product: (_q, ref) => ({ path: `${P}/${ref.id}`, method: "GET", access: pickerRead, schema: c.productView, expectedId: ref.id }),
  movements: (q, ref) => ({ path: `${P}/${ref.id}/movements${forward(q, ["from", "to", "kind", "includeReversals", ...paging])}`, method: "GET", access: catalogRead, schema: c.productMovementPage }),
  "movements-export": (q, ref) => ({ path: `${P}/${ref.id}/movements/export${forward(q, ["from", "to", "kind", "includeReversals"])}`, method: "GET", access: catalogRead, schema: noBody, file: "nhap-xuat-san-pham.xlsx" }),
  "product-lots": (_q, ref) => ({ path: `${P}/${ref.id}/harvest-lots`, method: "GET", access: catalogRead, schema: c.productLots }),
  "price-history": (q, ref) => ({ path: `${P}/${ref.id}/price-history${forward(q, ["unitId"])}`, method: "GET", access: catalogRead, schema: z.array(c.priceChange) }),
  groups: () => ({ path: G, method: "GET", access: catalogRead, schema: z.array(c.productGroupRaw) }),
  disposals: (q) => ({ path: `${D}${forward(q, [...disposalFilters, ...paging])}`, method: "GET", access: disposalAccess("View"), schema: c.disposalPage }),
  "disposals-export": (q) => ({ path: `${D}/export${forward(q, disposalFilters)}`, method: "GET", access: disposalAccess("Export"), schema: noBody, file: "phieu-xuat-huy-hau.xlsx" }),
  "disposal-next-code": () => ({ path: `${D}/next-code`, method: "GET", access: disposalAccess("View"), schema: c.nextCode }),
  disposal: (_q, ref) => ({ path: `${D}/${ref.id}`, method: "GET", access: disposalAccess("View"), schema: c.disposalView, expectedId: ref.id }),
};
/** The reads that need the id of a record in the path. */
const needsId = new Set(["product", "movements", "movements-export", "product-lots", "price-history", "disposal"]);

const unitRow = z.strictObject({ id: id.nullable().optional(), unitId: id.nullable().optional(), unitName: text(30), factor: z.number().positive().max(1_000_000), code, salePrice: z.number().int().positive().max(1e12).nullable().optional() });
const productBody = z.strictObject({
  code, name: z.string().max(200), unitPrice: z.number().int().positive().max(1e12), categoryId: id.nullable().optional(), description: text(2000), note: text(2000),
  minKg: nonNegative, maxKg: nonNegative, units: z.array(unitRow).max(20).optional(), rowVersion: rowVersion.optional(),
});
const nameBody = z.strictObject({ name: z.string().trim().min(1).max(100) });
const groupCreateBody = nameBody.extend({ parentId: id.nullable().optional() });
const groupUpdateBody = nameBody.extend({ rowVersion, parentId: id.nullable().optional() });
const disposalLineBody = z.strictObject({ productId: id, harvestLotId: id, kg: z.number().positive().max(1e9), note: text(500) });
const disposalBody = z.strictObject({
  code, disposedAt: z.iso.datetime({ offset: true }).nullable().optional(), zoneId: id, reason: text(1000), notes: text(1000),
  lines: z.array(disposalLineBody).max(200), complete: z.boolean().optional(), rowVersion: rowVersion.optional(),
});

const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("product-create"), body: productBody }),
  z.strictObject({ action: z.literal("product-update"), id, body: productBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.enum(["product-discontinue", "product-resume", "product-delete"]), id }),
  z.strictObject({ action: z.literal("product-photo-remove"), id, photoId: id }),
  z.strictObject({ action: z.literal("group-create"), body: groupCreateBody }),
  z.strictObject({ action: z.literal("group-update"), id, body: groupUpdateBody }),
  z.strictObject({ action: z.literal("group-delete"), id }),
  z.strictObject({ action: z.literal("group-reorder"), body: z.strictObject({ ids: z.array(id).max(200) }) }),
  z.strictObject({ action: z.literal("disposal-create"), body: disposalBody }),
  z.strictObject({ action: z.literal("disposal-update"), id, body: disposalBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.literal("disposal-complete"), id, body: z.strictObject({ rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("disposal-cancel"), id, body: z.strictObject({ reason, rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("disposal-delete"), id }),
]);
const uploadQuery = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("import") }), z.strictObject({ action: z.literal("photo"), id })]);

const done = z.object({ done: z.literal(true) });
function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "product-create": return { path: P, method: "POST", access: ownerOnly, schema: c.savedProduct, body: p.body };
    case "product-update": return { path: `${P}/${p.id}`, method: "PUT", access: ownerOnly, schema: c.savedProduct, body: p.body, expectedId: p.id };
    case "product-discontinue": return { path: `${P}/${p.id}/discontinue`, method: "POST", access: ownerOnly, schema: c.productView, expectedId: p.id };
    case "product-resume": return { path: `${P}/${p.id}/resume`, method: "POST", access: ownerOnly, schema: c.productView, expectedId: p.id };
    case "product-delete": return { path: `${P}/${p.id}`, method: "DELETE", access: ownerOnly, schema: c.removedProduct };
    case "product-photo-remove": return { path: `${P}/${p.id}/photos/${p.photoId}`, method: "DELETE", access: ownerOnly, schema: c.productView, expectedId: p.id };
    case "group-create": return { path: G, method: "POST", access: ownerOnly, schema: c.productGroupRaw, body: p.body };
    case "group-update": return { path: `${G}/${p.id}`, method: "PUT", access: ownerOnly, schema: c.productGroupRaw, body: p.body };
    case "group-delete": return { path: `${G}/${p.id}`, method: "DELETE", access: ownerOnly, schema: done, noContent: true };
    case "group-reorder": return { path: `${G}/reorder`, method: "POST", access: ownerOnly, schema: z.array(c.productGroupRaw), body: p.body };
    case "disposal-create": return { path: D, method: "POST", access: disposalAccess("Create"), schema: c.disposalView, body: p.body };
    case "disposal-update": return { path: `${D}/${p.id}`, method: "PUT", access: disposalAccess("Edit"), schema: c.disposalView, body: p.body, expectedId: p.id };
    case "disposal-complete": return { path: `${D}/${p.id}/complete`, method: "POST", access: disposalAccess("Edit"), schema: c.disposalView, body: p.body, expectedId: p.id };
    case "disposal-cancel": return { path: `${D}/${p.id}/cancel`, method: "POST", access: disposalAccess("Delete"), schema: c.disposalView, body: p.body, expectedId: p.id };
    case "disposal-delete": return { path: `${D}/${p.id}`, method: "DELETE", access: disposalAccess("Delete"), schema: done, noContent: true };
  }
}

const readQuery = z.record(z.string().max(60), z.string().max(200));

/** The allow-listed part of a problem answer that tells the form what to fix; nothing else of it reaches the browser. */
const projectProblem = (data: unknown) => problemExtras.safeParse(data).data;
const allowed = (access: Access, identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) =>
  identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && "any" in access && access.any.some(([fn, action]) => functions.some((p) => p.functionCode === fn && p.action === action));

export async function handleProducts(request: Request) {
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
      for (const key of new Set(query.keys())) { if (query.getAll(key).length !== 1) return json({ status: "invalid-input", code: "MSG01" }, 400); values[key] = query.get(key)!; }
      const parsed = readQuery.safeParse(values);
      const { action, id: refId, ...rest } = parsed.success ? parsed.data : { action: "" } as Query;
      if (!parsed.success || !Object.hasOwn(reads, action)) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const ref = { id: guid(refId) };
      if (refId && !ref.id || needsId.has(action) && !ref.id) return json({ status: "invalid-input", code: "MSG01" }, 400);
      for (const name of ["categoryId", "zoneId", "productId", "createdById", "unitId"]) if (rest[name] && !guid(rest[name])) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = reads[action](rest, ref);
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
          ? { path: `${P}/import`, method: "POST", access: ownerOnly, schema: c.importResult }
          : { path: `${P}/${target.data.id}/photos`, method: "POST", access: ownerOnly, schema: c.productView, expectedId: target.data.id };
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
