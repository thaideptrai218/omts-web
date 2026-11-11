import "server-only";
import { z } from "zod";
import { resourceKeys, resources, resourceCategoryFilters, projectResource, resourceAllowed, type ResourceKey } from "@/features/api-workspace/resources";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readFarmingProblem } from "../backend/farming-problem-copy";
import { projectCoordinateWarnings } from "@/features/farming-api/coordinate-warnings";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

const id = z.guid();
const resourceSchema = z.enum(resourceKeys);
const mutationSchema = z.strictObject({ action: z.enum(["create", "update", "discontinue", "reactivate", "lock", "unlock"]),
  id: id.optional(), zoneId: id.optional(), body: z.record(z.string(), z.json()) });
const paths: Record<ResourceKey, string> = { zones: "/api/zones", suppliers: "/api/suppliers", "input-items": "/api/farming-input-items",
  employees: "/api/employees", rafts: "/api/rafts", accounts: "/api/accounts", roles: "/api/roles", customers: "/api/customers" };

export async function handleResourceRequest(request: Request, resourceName: string) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const resource = resourceSchema.safeParse(resourceName);
  if (!resource.success) return json({ status: "not-found" }, 404);
  const key = resource.data;
  const category = resourceCategoryFilters[key];
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const config = parseServerBackendConfig(process.env);
  if (config.status !== "valid" || config.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let action = "list";
    let recordId: string | undefined;
    let zoneId: string | undefined;
    let body: Record<string, unknown> | undefined;
    const query = new URL(request.url).searchParams;
    if (request.method === "GET") {
      const keys = [...query.keys()];
      if (new Set(keys).size !== keys.length || keys.some((name) => !["proposal", "id", "zoneId", "search", "page", "pageSize", "statusId", ...(category ? [category.key] : [])].includes(name))) return json({ status: "invalid-input" }, 400);
      if (category && query.has(category.key) && (query.has("id") || !category.options.some(([value]) => value === query.get(category.key)))) return json({ status: "invalid-input" }, 400);
      if (query.has("proposal")) {
        // Code proposals: input items, zones (KV01...) and rafts (needs the zone id in the query).
        const proposable = key === "input-items" || key === "zones" || key === "rafts";
        if (!proposable || query.size !== (key === "rafts" ? 2 : 1) || query.get("proposal") !== "1" || (key === "rafts") !== query.has("zoneId")) return json({ status: "invalid-input" }, 400);
        action = "proposal";
      }
      if (query.has("id")) {
        const checked = id.safeParse(query.get("id"));
        if (!checked.success) return json({ status: "invalid-input" }, 400);
        recordId = checked.data; action = "read";
      }
      if (query.has("zoneId")) {
        const checked = id.safeParse(query.get("zoneId"));
        if (!checked.success) return json({ status: "invalid-input" }, 400);
        zoneId = checked.data;
      }
      if (query.has("search") && (query.get("search")?.length ?? 0) > 200) return json({ status: "invalid-input" }, 400);
      for (const name of ["page", "pageSize", "statusId"]) if (query.has(name) && !/^[1-9]\d{0,6}$/.test(query.get(name) ?? "")) return json({ status: "invalid-input" }, 400);
      if (Number(query.get("pageSize") ?? 20) > 100) return json({ status: "invalid-input" }, 400);
    } else {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const input = mutationSchema.safeParse(check.body.readForValidation());
      if (!input.success) return json({ status: "invalid-input" }, 400);
      ({ action, zoneId, body } = input.data); recordId = input.data.id;
      if (!resources[key].editable || (action === "create" && resources[key].creatable === false) || (action !== "create" && !recordId)
        || (key === "customers" && !["create", "update"].includes(action))
        || (["lock", "unlock"].includes(action) && key !== "accounts")) return json({ status: "invalid-input" }, 400);
      const allowed = [...resources[key].fields.map((field) => field.key), "rowVersion", "reason",
        ...(key === "employees" ? ["workingZoneIds", "bankAccount", "accountId"] : []), ...(key === "rafts" ? ["laneCount"] : [])];
      if (Object.keys(body).some((field) => !allowed.includes(field))) return json({ status: "invalid-input" }, 400);
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const permissionAction = action === "list" || action === "read" ? "View" : action === "create" ? "Create" : "Edit";
    if (!resourceAllowed(key, context.context.identity, context.context.permissions.functionPermissions, permissionAction)) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (action === "proposal" && initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    if (key === "rafts" && !recordId && !zoneId) return json({ status: "invalid-input" }, 400);
    let path = key === "rafts" && !recordId ? `/api/zones/${zoneId}/rafts` : paths[key] + (recordId ? `/${recordId}` : "");
    if (action === "proposal") path += "/next-code";
    if (["discontinue", "reactivate", "lock", "unlock"].includes(action)) path += `/${action}`;
    const upstreamQuery = new URLSearchParams();
    if (action === "list") {
      const allowed = key === "roles" || key === "rafts" ? ["statusId"] : key === "input-items" ? ["search", "statusId"] : ["search", "statusId", "page", "pageSize"];
      for (const name of allowed) if (query.has(name)) upstreamQuery.set(name, query.get(name)!);
      if (category && query.has(category.key)) upstreamQuery.set(category.key, query.get(category.key)!);
    }
    const target = new URL(path, config.config.origin);
    target.search = upstreamQuery.toString();
    const method = action === "list" || action === "read" || action === "proposal" ? "GET" : action === "update" ? "PUT" : "POST";
    // Supplier/item status endpoints are bodyless; zone status needs rowVersion.
    const payload = (action === "discontinue" || action === "reactivate") && !["zones", "rafts"].includes(key) ? undefined : body;
    const controller = new AbortController();
    const onAbort = () => controller.abort(); request.signal.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(onAbort, config.config.timeoutMs);
    let upstream, failedCopy: Response | undefined;
    try {
      const response = await fetch(target, { method, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`,
        ...(payload ? { "Content-Type": "application/json" } : {}) }, body: payload ? JSON.stringify(payload) : undefined,
        credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal });
      failedCopy = response.ok || key !== "zones" && key !== "rafts" ? undefined : response.clone();
      upstream = await readBackendResponse(response, "profileRead", ["suppliers", "input-items"].includes(key));
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", onAbort); }
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (request.signal.aborted) return json({ status: "unavailable" }, 503);
    if (upstream.status === "http-error") return json({ status: "rejected", code: upstream.code, ...(await readFarmingProblem(failedCopy).then(problem => problem ? { problem } : {})), ...(upstream.catalogueProblem ? { catalogueProblem: upstream.catalogueProblem } : {}) }, upstream.httpStatus);
    if (upstream.status !== "success" || ![200, 201].includes(upstream.httpStatus)) return json({ status: "unavailable" }, 503);
    if (action === "proposal") {
      const proposal = z.object({ code: z.string().min(1).max(30), seedUnit: z.string().min(1).max(50).nullish() }).safeParse(upstream.data);
      return proposal.success ? json({ status: "success", data: proposal.data }) : json({ status: "invalid-response" }, 502);
    }
    const result = projectResource(key, upstream.data, action !== "list", action === "list"
      ? { page: Number(query.get("page") ?? 1), pageSize: Number(query.get("pageSize") ?? 20), search: query.get("search") ?? undefined } : undefined);
    if (recordId && (!result || typeof result !== "object" || !("id" in result) || result.id !== recordId)) return json({ status: "invalid-response" }, 502);
    if (result === undefined) return json({ status: "invalid-response" }, 502);
    // Zone and raft saves may carry non-blocking coordinate warnings (outside Vietnam, raft far from its zone); pass the allow-listed ones on with the record.
    const warnings = (key === "zones" || key === "rafts") && (action === "create" || action === "update") ? projectCoordinateWarnings(upstream.data) : [];
    return json({ status: "success", data: warnings.length && typeof result === "object" ? { ...result, warnings } : result });
  } catch { return json({ status: "unavailable" }, 503); }
}
