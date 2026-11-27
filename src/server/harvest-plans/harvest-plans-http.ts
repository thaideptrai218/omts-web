import "server-only";
import { z } from "zod";
import * as c from "@/features/harvest-plans/contracts";
import { problemExtras } from "@/features/input-items/contracts";
import { idList } from "../operations/sales-report-plan";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

/**
 * The browser's door to Kế hoạch thu hoạch (api/harvest-plans): the list, one plan by id or by code, the plans given out to the caller's zones, the next
 * code, the form of a plan made from an order, the Nhân công of a plan (read, and set the crew of one line), and the writes (save, assign, receive, hand over, finish, cancel, skip and unskip lanes). Each action names the backend call, who
 * may make it and the shape the answer must have; query values are forwarded only for the names an action lists. The harvest of a lane plan itself goes
 * through the existing harvest door (api/operations/harvest) with the line id.
 */
const id = z.guid(), reason = z.string().trim().min(1).max(500), cancelReason = z.string().trim().min(1).max(1000), rowVersion = z.string().min(1).max(200);
const code = z.string().regex(/^[A-Za-z0-9._-]{1,30}$/).nullable().optional();
const text = (max: number) => z.string().max(max).nullable().optional();
const instant = z.iso.datetime({ offset: true });
const lanes = z.array(z.number().int().min(1).max(999)).min(1).max(200).refine((values) => new Set(values).size === values.length);

/** Who may make a call: the Owner always; a staff account when it holds any of the listed function permissions. */
type Access = { any: readonly (readonly [string, string])[] };
const plans = (action: string): Access => ({ any: [["HARVEST_PLANS", action]] });
/** Recording a lot from a plan line or marking lanes "Không thu" is the zone manager's work and needs the right to record a harvest. */
const harvests = (action: string): Access => ({ any: [["HARVESTS", action]] });
/** Choosing the crew of a plan line gives its employees work assignments, so it needs the right to create them (the API checks the zone and the status of the plan). */
const assignments = (action: string): Access => ({ any: [["WORK_ASSIGNMENTS", action]] });

const listFilters = ["search", "zoneId", "zoneIds", "from", "to", "salesOrderId"] as const;
const paging = ["page", "pageSize"] as const;
const guidFilters = ["zoneId", "salesOrderId"];
const dateFilters = ["from", "to"];
const statusIds = new Set(["4201", "4202", "4203", "4204", "4205", "4206", "4207"]);
const codePattern = /^[A-Za-z0-9._-]{1,30}$/;

type Query = Record<string, string>;
type Plan = { path: string; method: "GET" | "POST" | "PUT"; access: Access; schema: z.ZodType; body?: unknown; expectedId?: string };
/** The listed names are forwarded as they are; `statusIds` and `zoneIds` are comma lists on the web side and repeat as a parameter for the API. */
function forward(query: Query, names: readonly string[]) {
  const params = new URLSearchParams();
  for (const name of names) if (query[name] && name !== "zoneIds") params.append(name, query[name]);
  if (query.statusIds) for (const value of query.statusIds.split(",")) params.append("statusIds", value);
  if (query.zoneIds && names.includes("zoneIds")) for (const value of idList.parse(query.zoneIds)) params.append("zoneIds", value);
  return params.size ? `?${params}` : "";
}
const guid = (value: string | undefined) => id.safeParse(value).success ? value! : undefined;
const P = "/api/harvest-plans";

type Read = (q: Query, ref: { id?: string }) => Plan;
const reads: Record<string, Read> = {
  plans: (q) => ({ path: `${P}${forward(q, [...listFilters, ...paging])}`, method: "GET", access: plans("View"), schema: c.planPage }),
  plan: (_q, ref) => ({ path: `${P}/${ref.id}`, method: "GET", access: plans("View"), schema: c.planView, expectedId: ref.id }),
  "plan-staffing": (_q, ref) => ({ path: `${P}/${ref.id}/staffing`, method: "GET", access: plans("View"), schema: c.planStaffing, expectedId: ref.id }),
  "plan-by-code": (q) => ({ path: `${P}/by-code/${encodeURIComponent(q.code)}`, method: "GET", access: plans("View"), schema: c.planView }),
  "plan-next-code": () => ({ path: `${P}/next-code`, method: "GET", access: plans("Create"), schema: c.nextCode }),
  "plan-eligible-rafts": (q) => ({ path: `${P}/eligible-rafts${forward(q, ["zoneId"])}`, method: "GET", access: plans("Create"), schema: c.eligibleRafts }),
  "plan-order-draft": (_q, ref) => ({ path: `${P}/order-draft/${ref.id}`, method: "GET", access: plans("Create"), schema: c.planDraft }),
  "plans-assigned": () => ({ path: `${P}/assigned`, method: "GET", access: harvests("View"), schema: c.planList }),
};
/** The reads that need the id of a record. */
const needsId = new Set(["plan", "plan-order-draft", "plan-staffing"]);

// Raft plans send no lanes; [] also retains an existing plan's legacy lanes.
const lineBody = z.strictObject({ id: id.optional(), raftId: id, laneNumbers: lanes.or(z.tuple([])), expectedCageCount: z.number().positive().max(100_000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6).nullable().optional(), note: text(500) });
const planBody = z.strictObject({
  code, plannedAt: instant, note: text(1000), salesOrderIds: z.array(id).max(20), lines: z.array(lineBody).min(1).max(50), rowVersion: rowVersion.optional(),
});
const versioned = z.strictObject({ rowVersion: rowVersion.optional() });
const crew = z.array(id).max(100).refine((values) => new Set(values).size === values.length);
const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("plan-create"), body: planBody.omit({ rowVersion: true }) }),
  z.strictObject({ action: z.literal("plan-update"), id, body: planBody.required({ rowVersion: true }) }),
  z.strictObject({ action: z.literal("plan-assign"), id, body: z.strictObject({ rowVersion: rowVersion.optional(), executor: z.enum(c.planExecutors).optional() }) }),
  z.strictObject({ action: z.literal("plan-receive"), id, body: versioned }),
  z.strictObject({ action: z.literal("plan-hand-over"), id, body: versioned }),
  z.strictObject({ action: z.literal("plan-finish"), id, body: versioned }),
  z.strictObject({ action: z.literal("plan-cancel"), id, body: z.strictObject({ reason: cancelReason, rowVersion: rowVersion.optional() }) }),
  z.strictObject({ action: z.literal("plan-skip-lanes"), id, lineId: id, body: z.strictObject({ laneNumbers: lanes, reason }) }),
  z.strictObject({ action: z.literal("plan-unskip-lanes"), id, lineId: id, body: z.strictObject({ laneNumbers: lanes }) }),
  z.strictObject({ action: z.literal("plan-line-staffing"), id, lineId: id, body: z.strictObject({ employeeIds: crew, moveExisting: z.boolean().optional(), rowVersion: rowVersion.optional() }) }),
]);

function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "plan-create": return { path: P, method: "POST", access: plans("Create"), schema: c.planAnswer, body: p.body };
    case "plan-update": return { path: `${P}/${p.id}`, method: "PUT", access: plans("Edit"), schema: c.planAnswer, body: p.body };
    case "plan-assign": return { path: `${P}/${p.id}/assign`, method: "POST", access: plans("Edit"), schema: c.ack, body: p.body };
    case "plan-receive": return { path: `${P}/${p.id}/receive`, method: "POST", access: harvests("Create"), schema: c.ack, body: p.body };
    case "plan-hand-over": return { path: `${P}/${p.id}/hand-over`, method: "POST", access: harvests("Create"), schema: c.ack, body: p.body };
    case "plan-finish": return { path: `${P}/${p.id}/finish`, method: "POST", access: plans("Edit"), schema: c.ack, body: p.body };
    case "plan-cancel": return { path: `${P}/${p.id}/cancel`, method: "POST", access: plans("Delete"), schema: c.ack, body: p.body };
    case "plan-skip-lanes": return { path: `${P}/${p.id}/lines/${p.lineId}/skip-lanes`, method: "POST", access: harvests("Create"), schema: c.ack, body: p.body };
    case "plan-line-staffing": return { path: `${P}/${p.id}/lines/${p.lineId}/staffing`, method: "PUT", access: assignments("Create"), schema: c.staffingLine, body: p.body };
    case "plan-unskip-lanes": return { path: `${P}/${p.id}/lines/${p.lineId}/unskip-lanes`, method: "POST", access: harvests("Create"), schema: c.ack, body: p.body };
  }
}

// `zoneIds` is a comma list of up to 50 ids (idList checks it); every other value stays short.
const readQuery = z.record(z.string().max(60), z.string().max(50 * 37)).refine((values) => Object.entries(values).every(([name, value]) => name === "zoneIds" || value.length <= 200));

/** The allow-listed part of a problem answer that tells the form what to fix; nothing else of it reaches the browser. */
const projectProblem = (data: unknown) => problemExtras.safeParse(data).data;
const allowed = (access: Access, identity: { subjectType: string }, functions: readonly { functionCode: string; action: string }[]) =>
  identity.subjectType === "CooperativeOwner" || identity.subjectType === "Staff" && access.any.some(([fn, action]) => functions.some((p) => p.functionCode === fn && p.action === action));

const invalid = (json: (body: unknown, status?: number) => Response) => json({ status: "invalid-input", code: "MSG01" }, 400);

export async function handleHarvestPlans(request: Request) {
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
      if (action === "plan-by-code" && !codePattern.test(rest.code ?? "")) return invalid(json);
      for (const name of guidFilters) if (rest[name] && !guid(rest[name])) return invalid(json);
      for (const name of dateFilters) if (rest[name] && !z.iso.date().safeParse(rest[name]).success) return invalid(json);
      // Several zones of the header; the backend intersects them with the zones the caller may read.
      if (rest.zoneIds && (!idList.safeParse(rest.zoneIds).success || rest.zoneId)) return invalid(json);
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
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(contentType ? { "Content-Type": contentType } : {}) } });
    const sameSession = async () => { const current = await gateway.resolve(request.headers.get("cookie")); return current.status === "resolved" && sameEmployeeSession(initial.session, current.session); };
    // A command may answer 204; the screen only needs to know it was done.
    if (response.status === 204 && plan.method === "POST") {
      if (!(await sameSession())) return json({ status: "session-expired" }, 401);
      return json({ status: "success", data: { done: true } });
    }
    const copy = response.ok ? undefined : response.clone();
    const result = await readBackendResponse(response, "profileRead", true, true);
    if (!(await sameSession())) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") {
      const problem = copy ? projectProblem(await copy.json().catch(() => undefined)) : undefined;
      return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}) }, result.httpStatus);
    }
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = plan.schema.safeParse(result.data);
    const answered = value.success ? value.data as { id?: string; planId?: string } : undefined;
    if (!value.success || plan.expectedId && (answered?.id ?? answered?.planId) !== plan.expectedId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
