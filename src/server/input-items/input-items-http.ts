import "server-only";
import { z } from "zod";
import * as c from "@/features/input-items/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

/**
 * The browser's door to the Vật tư & Giống module: the item catalogue (api/farming-input-items), its units, groups, settings and issue types,
 * the movements and seed lots of an item, the issue documents (api/input-issues) and the receipt price setup. Each action names the backend
 * call, who may make it and the shape the answer must have; query values are forwarded only for the names an action lists.
 */
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const maxUploadBytes = 3 * 1024 * 1024;
const id = z.guid(), reason = z.string().trim().min(1).max(1000), rowVersion = z.string().min(1).max(200);
const code = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional();
const text = (max: number) => z.string().max(max).nullable().optional();
const nonNegative = z.number().min(0).max(1e12).nullable().optional();

/** Who may make a call: the Owner always; a staff account when it holds any of the listed function permissions; `owner` allows only the Owner. */
type Access = { owner: true } | { any: readonly (readonly [string, string])[] };
const catalogRead: Access = { any: [["PURCHASE_RECEIPTS", "View"], ["SUPPLIER_PAYMENTS", "View"], ["CULTIVATION_CYCLES", "View"], ["INPUT_ISSUES", "View"]] };
const ownerOnly: Access = { owner: true };
const issueRead: Access = { any: [["INPUT_ISSUES", "View"], ["INPUT_DISPOSALS", "View"]] };
const issueExport: Access = { any: [["INPUT_ISSUES", "Export"], ["INPUT_DISPOSALS", "Export"]] };
const usageIssueAccess = (action: string): Access => ({ any: [["INPUT_ISSUES", action]] });

const itemFilters = ["search", "group", "itemGroupId", "stock", "supplierId", "createdFrom", "createdTo", "status", "sortBy", "sortDir"] as const;
const issueFilters = ["search", "kind", "status", "from", "to", "zoneId", "raftId", "issueTypeId", "createdById", "receiverId", "sortBy", "sortDir"] as const;
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
const F = "/api/farming-input-items", I = "/api/input-issues", R = "/api/purchase-receipts";

type Read = (q: Query, ref: { id?: string; second?: string }) => Plan;
const reads: Record<string, Read> = {
  items: (q) => ({ path: `${F}/search${forward(q, [...itemFilters, ...paging])}`, method: "GET", access: catalogRead, schema: c.itemPage }),
  "items-all": (q) => ({ path: `${F}${forward(q, ["search", "group", "statusId"])}`, method: "GET", access: catalogRead, schema: c.itemList }),
  "items-export": (q) => ({ path: `${F}/export${forward(q, itemFilters)}`, method: "GET", access: { any: [["PURCHASE_RECEIPTS", "Export"]] }, schema: noBody, file: "vat-tu-giong.xlsx" }),
  "items-template": () => ({ path: `${F}/import/template`, method: "GET", access: ownerOnly, schema: noBody, file: "mau-vat-tu-giong.xlsx" }),
  "item-next-code": (q) => ({ path: `${F}/next-code${forward(q, ["group"])}`, method: "GET", access: catalogRead, schema: c.nextCode }),
  item: (_q, ref) => ({ path: `${F}/${ref.id}`, method: "GET", access: catalogRead, schema: c.itemView, expectedId: ref.id }),
  movements: (q, ref) => ({ path: `${F}/${ref.id}/movements${forward(q, ["from", "to", "kind", "includeReversals", ...paging])}`, method: "GET", access: catalogRead, schema: c.movementPage }),
  "movements-export": (q, ref) => ({ path: `${F}/${ref.id}/movements/export${forward(q, ["from", "to", "kind", "includeReversals"])}`, method: "GET", access: { any: [["PURCHASE_RECEIPTS", "Export"]] }, schema: noBody, file: "nhap-xuat.xlsx" }),
  "seed-lots": (_q, ref) => ({ path: `${F}/${ref.id}/seed-lots`, method: "GET", access: catalogRead, schema: c.seedLots }),
  units: () => ({ path: "/api/input-units", method: "GET", access: catalogRead, schema: z.array(c.inputUnit) }),
  groups: () => ({ path: "/api/input-item-groups", method: "GET", access: catalogRead, schema: z.array(c.inputGroup) }),
  settings: () => ({ path: "/api/input-inventory-settings", method: "GET", access: catalogRead, schema: c.settings }),
  "issue-types": () => ({ path: "/api/input-issue-types", method: "GET", access: catalogRead, schema: z.array(c.issueType) }),
  issues: (q) => ({ path: `${I}${forward(q, [...issueFilters, ...paging])}`, method: "GET", access: issueRead, schema: c.issuePage }),
  "issues-export": (q) => ({ path: `${I}/export${forward(q, issueFilters)}`, method: "GET", access: issueExport, schema: noBody, file: "phieu-xuat.xlsx" }),
  "issue-next-code": (q) => ({ path: `${I}/next-code${forward(q, ["kind"])}`, method: "GET", access: issueRead, schema: c.nextCode }),
  "issue-receivers": (q) => ({ path: `${I}/receivers${forward(q, ["zoneId"])}`, method: "GET", access: usageIssueAccess("View"), schema: c.receivers }),
  issue: (_q, ref) => ({ path: `${I}/${ref.id}`, method: "GET", access: issueRead, schema: c.issueView, expectedId: ref.id }),
  "price-setup": (_q, ref) => ({ path: `${R}/${ref.id}/price-setup`, method: "GET", access: { any: [["PURCHASE_RECEIPTS", "View"]] }, schema: c.priceSetup }),
};
/** The reads that need the id of a record in the path. */
const needsId = new Set(["item", "movements", "movements-export", "seed-lots", "issue", "price-setup"]);

const unitRow = z.strictObject({ id: id.nullable().optional(), unitId: id.nullable().optional(), unitName: text(30), factor: z.number().positive().max(1_000_000), code, isBase: z.boolean() });
const itemBody = z.strictObject({
  code, name: z.string().max(200), group: z.enum(["Seed", "Material", "Other"]), itemGroupId: id.nullable().optional(), description: text(2000), notes: text(2000),
  minQuantity: nonNegative, maxQuantity: nonNegative, costPrice: nonNegative, openingQuantity: nonNegative, units: z.array(unitRow).min(1).max(20).optional(), unit: text(30), rowVersion: rowVersion.optional(),
});
const nameBody = z.strictObject({ name: z.string().trim().min(1).max(100) });
const renameBody = nameBody.extend({ rowVersion });
const groupCreateBody = nameBody.extend({ parentId: id.nullable().optional() });
const groupUpdateBody = renameBody.extend({ parentId: id.nullable().optional() });
const issueLineBody = z.strictObject({ itemId: id, itemUnitId: id.nullable().optional(), quantity: z.number().positive().max(1e9), seedLotLineId: id.nullable().optional(), note: text(500) });
const issueBody = z.strictObject({
  kind: z.enum(["Use", "Disposal"]).optional(), code, issuedAt: z.iso.datetime({ offset: true }).nullable().optional(), zoneId: id.nullable().optional(), raftId: id.nullable().optional(),
  issueTypeId: id.nullable().optional(), receiverEmployeeId: id.nullable().optional(), reason: text(1000), notes: text(1000), lines: z.array(issueLineBody).max(200), complete: z.boolean().optional(), rowVersion: rowVersion.optional(),
});

const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("item-create"), body: itemBody }),
  z.strictObject({ action: z.literal("item-update"), id, body: itemBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.enum(["item-discontinue", "item-resume", "item-delete"]), id }),
  z.strictObject({ action: z.literal("item-photo-remove"), id, photoId: id }),
  z.strictObject({ action: z.literal("seed-lot-delete"), id, lotId: id }),
  z.strictObject({ action: z.enum(["unit-create", "issue-type-create"]), body: nameBody }),
  z.strictObject({ action: z.literal("group-create"), body: groupCreateBody }),
  z.strictObject({ action: z.enum(["unit-update", "issue-type-update"]), id, body: renameBody }),
  z.strictObject({ action: z.literal("group-update"), id, body: groupUpdateBody }),
  z.strictObject({ action: z.enum(["unit-delete", "group-delete", "issue-type-delete"]), id }),
  z.strictObject({ action: z.literal("group-reorder"), body: z.strictObject({ ids: z.array(id).max(200) }) }),
  z.strictObject({ action: z.literal("settings-update"), body: z.strictObject({ costMethod: z.enum(["Fixed", "Average"]), allowNegativeQuantity: z.boolean(), rowVersion }) }),
  z.strictObject({ action: z.literal("issue-create"), body: issueBody }),
  z.strictObject({ action: z.literal("issue-update"), id, body: issueBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.literal("issue-complete"), id, body: z.strictObject({ rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("issue-cancel"), id, body: z.strictObject({ reason, rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("issue-delete"), id }),
  z.strictObject({ action: z.literal("price-setup-update"), id, body: z.strictObject({ items: z.array(z.strictObject({ itemId: id, costPrice: nonNegative })).max(200) }) }),
]);
const uploadQuery = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("import") }), z.strictObject({ action: z.literal("photo"), id })]);

const done = z.object({ done: z.literal(true) });
function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "item-create": return { path: F, method: "POST", access: ownerOnly, schema: c.itemView, body: p.body };
    case "item-update": return { path: `${F}/${p.id}`, method: "PUT", access: ownerOnly, schema: c.itemView, body: p.body, expectedId: p.id };
    case "item-discontinue": return { path: `${F}/${p.id}/discontinue`, method: "POST", access: ownerOnly, schema: c.itemView, expectedId: p.id };
    case "item-resume": return { path: `${F}/${p.id}/resume`, method: "POST", access: ownerOnly, schema: c.itemView, expectedId: p.id };
    case "item-delete": return { path: `${F}/${p.id}`, method: "DELETE", access: ownerOnly, schema: c.removedItem };
    case "item-photo-remove": return { path: `${F}/${p.id}/photos/${p.photoId}`, method: "DELETE", access: ownerOnly, schema: c.itemView, expectedId: p.id };
    case "seed-lot-delete": return { path: `${F}/${p.id}/seed-lots/${p.lotId}`, method: "DELETE", access: ownerOnly, schema: c.removedItem };
    case "unit-create": return { path: "/api/input-units", method: "POST", access: ownerOnly, schema: c.inputUnit, body: p.body };
    case "unit-update": return { path: `/api/input-units/${p.id}`, method: "PUT", access: ownerOnly, schema: c.inputUnit, body: p.body };
    case "unit-delete": return { path: `/api/input-units/${p.id}`, method: "DELETE", access: ownerOnly, schema: done, noContent: true };
    case "group-create": return { path: "/api/input-item-groups", method: "POST", access: ownerOnly, schema: c.inputGroup, body: p.body };
    case "group-update": return { path: `/api/input-item-groups/${p.id}`, method: "PUT", access: ownerOnly, schema: c.inputGroup, body: p.body };
    case "group-delete": return { path: `/api/input-item-groups/${p.id}`, method: "DELETE", access: ownerOnly, schema: done, noContent: true };
    case "group-reorder": return { path: "/api/input-item-groups/reorder", method: "POST", access: ownerOnly, schema: z.array(c.inputGroup), body: p.body };
    case "issue-type-create": return { path: "/api/input-issue-types", method: "POST", access: ownerOnly, schema: c.issueType, body: p.body };
    case "issue-type-update": return { path: `/api/input-issue-types/${p.id}`, method: "PUT", access: ownerOnly, schema: c.issueType, body: p.body };
    case "issue-type-delete": return { path: `/api/input-issue-types/${p.id}`, method: "DELETE", access: ownerOnly, schema: done, noContent: true };
    case "settings-update": return { path: "/api/input-inventory-settings", method: "PUT", access: ownerOnly, schema: c.settings, body: p.body };
    // A disposal is the Owner's alone, which the API decides; the door only asks for the zone-scoped function a use issue needs.
    case "issue-create": return { path: I, method: "POST", access: p.body.kind === "Disposal" ? ownerOnly : usageIssueAccess("Create"), schema: c.issueView, body: p.body };
    case "issue-update": return { path: `${I}/${p.id}`, method: "PUT", access: usageIssueAccess("Edit"), schema: c.issueView, body: p.body, expectedId: p.id };
    case "issue-complete": return { path: `${I}/${p.id}/complete`, method: "POST", access: usageIssueAccess("Edit"), schema: c.issueView, body: p.body, expectedId: p.id };
    case "issue-cancel": return { path: `${I}/${p.id}/cancel`, method: "POST", access: usageIssueAccess("Delete"), schema: c.issueView, body: p.body, expectedId: p.id };
    case "issue-delete": return { path: `${I}/${p.id}`, method: "DELETE", access: usageIssueAccess("Delete"), schema: done, noContent: true };
    case "price-setup-update": return { path: `${R}/${p.id}/price-setup`, method: "PUT", access: ownerOnly, schema: c.priceSetup, body: p.body };
  }
}

const readQuery = z.record(z.string().max(60), z.string().max(200));

/** The allow-listed part of a problem answer that tells the form what to fix; nothing else of it reaches the browser. */
const projectProblem = (data: unknown) => c.problemExtras.safeParse(data).data;
const allowed = (access: Access, identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) =>
  identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && "any" in access && access.any.some(([fn, action]) => functions.some((p) => p.functionCode === fn && p.action === action));

export async function handleInputItems(request: Request) {
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
      for (const name of ["itemGroupId", "supplierId", "zoneId", "raftId", "issueTypeId", "createdById", "receiverId"]) if (rest[name] && !guid(rest[name])) return json({ status: "invalid-input", code: "MSG01" }, 400);
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
          ? { path: `${F}/import`, method: "POST", access: ownerOnly, schema: c.importResult }
          : { path: `${F}/${target.data.id}/photos`, method: "POST", access: ownerOnly, schema: c.itemView, expectedId: target.data.id };
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
