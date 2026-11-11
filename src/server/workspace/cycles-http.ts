import "server-only";
import { z } from "zod";
import { zoneCycles, cycleHistory, cycleProgress, cycleInput, cycleView } from "@/features/cycles-api/contracts";
import { createCsrfGuard } from "../auth/csrf-guard";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { readFarmingProblem } from "../backend/farming-problem-copy";
import { sameEmployeeSession } from "../employees/employee-session";
import { planCycleClose, planCycleCloseRead, type CycleClosePlan } from "./cycles-close-plan";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
const allowedFor = (context: { identity: { subjectType: string }; permissions: { functionPermissions: readonly { functionCode: string; action: string }[] } }, permission: string) =>
  context.identity.subjectType === "CooperativeOwner" || context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === permission);

/** Summary and close preview (GET) and the close (POST): same session, permission and answer-shape checks as the other cycle calls. */
async function relayClose(request: Request, plan: CycleClosePlan): Promise<Response> {
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  const initial = await gateway.resolve(request.headers.get("cookie"));
  if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
  const application = await gateway.application(request.headers.get("cookie"));
  if (application.status !== "ready") return json({ status: "unavailable" }, 503);
  if (!allowedFor(application.context, plan.permission)) return json({ status: "forbidden", code: "MSG02" }, 403);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
  const response = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, body: plan.body ? JSON.stringify(plan.body) : undefined, cache: "no-store", credentials: "omit", redirect: "error", signal,
    headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(plan.body ? { "Content-Type": "application/json" } : {}) } });
  const copy = response.ok ? undefined : response.clone();
  const result = await readBackendResponse(response, "profileRead");
  const current = await gateway.resolve(request.headers.get("cookie"));
  if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
  if (signal.aborted) return json({ status: "unavailable" }, 503);
  if (result.status === "http-error") {
    // MSG-CYCLE-07 (confirmFlag ownerApproved) and the other questions travel as an allow-listed `problem`.
    const problem = await readFarmingProblem(copy);
    return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}) }, result.httpStatus);
  }
  if (result.status !== "success") return json({ status: "unavailable" }, 503);
  const value = plan.schema.safeParse(result.data);
  if (!value.success || plan.answerCycleId(value.data) !== plan.cycleId) return json({ status: "invalid-response" }, 502);
  return json({ status: "success", data: value.data });
}

export async function handleCycles(request: Request) {
  const query = new URL(request.url).searchParams;
  const isClose = ["summary", "close-preview", "cycle-history"].includes(query.get("action") ?? "");
  if (isClose) {
    const plan = request.method === "GET" ? planCycleCloseRead(query) : undefined;
    if (!plan) return json({ status: "invalid-input" }, 400);
    try { return await relayClose(request, plan); } catch { return json({ status: "unavailable" }, 503); }
  }
  const parsed = z.discriminatedUnion("action", [
    z.strictObject({ action: z.literal("zone"), zoneId: z.guid() }),
    z.strictObject({ action: z.literal("history"), raftId: z.guid() }),
    z.strictObject({ action: z.literal("progress"), raftId: z.guid(), date: z.iso.date().optional(), cycleId: z.guid().optional() }),
  ]).safeParse(Object.fromEntries(query));
  if (request.method !== "GET" || !parsed.success || new Set(query.keys()).size !== query.size) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    const application = await gateway.application(request.headers.get("cookie"));
    if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    if (!allowedFor(application.context, "View")) return json({ status: "forbidden", code: "MSG02" }, 403);
    const q = parsed.data;
    const path = q.action === "zone" ? `/api/zones/${q.zoneId}/cultivation-cycles` : q.action === "history" ? `/api/rafts/${q.raftId}/cultivation-cycles` : `/api/rafts/${q.raftId}/progress?${new URLSearchParams({ ...(q.date ? { date: q.date } : {}), ...(q.cycleId ? { cycleId: q.cycleId } : {}) })}`;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(path, backend.config.origin), { headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || signal.aborted) return json({ status: "unavailable" }, 503);
    const value = (q.action === "zone" ? zoneCycles : q.action === "history" ? cycleHistory : cycleProgress).safeParse(result.data);
    if (!value.success || q.action === "progress" && "raftId" in value.data && value.data.raftId !== q.raftId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}

export async function handleCycleWrite(request: Request) {
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const csrf = createCsrfGuard(process.env); if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
    const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
    if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    const input = check.body.readForValidation();
    if (new URL(request.url).search) return json({ status: "invalid-input" }, 400);
    if ((input as { action?: unknown } | null)?.action === "close") {
      const plan = planCycleClose(input);
      return plan ? await relayClose(request, plan) : json({ status: "invalid-input" }, 400);
    }
    const command = z.discriminatedUnion("action", [
      z.strictObject({ action: z.literal("start"), id: z.guid(), body: cycleInput }),
      z.strictObject({ action: z.literal("edit"), id: z.guid(), body: cycleInput.extend({ rowVersion: z.string().min(1) }) }),
      z.strictObject({ action: z.literal("cancel"), id: z.guid(), body: z.strictObject({ rowVersion: z.string().min(1) }) }),
    ]).safeParse(input);
    if (!command.success) return json({ status: "invalid-input" }, 400);
    const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    const application = await gateway.application(request.headers.get("cookie")); if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    const q = command.data, permission = q.action === "start" ? "Create" : q.action === "edit" ? "Edit" : "Delete";
    if (!allowedFor(application.context, permission)) return json({ status: "forbidden", code: "MSG02" }, 403);
    const path = q.action === "start" ? `/api/rafts/${q.id}/cultivation-cycles` : `/api/cultivation-cycles/${q.id}${q.action === "cancel" ? "/cancel" : ""}`;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(path, backend.config.origin), { method: q.action === "edit" ? "PUT" : "POST", body: JSON.stringify(q.body), headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", redirect: "error", credentials: "omit", signal });
    const result = response.status === 204 && q.action === "cancel" ? undefined : await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie")); if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (!result) return json({ status: "success", data: { cancelled: true } });
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success") return json({ status: "unavailable" }, 503);
    const saved = z.object({ cycle: cycleView }).safeParse(result.data);
    if (!saved.success || q.action === "edit" && saved.data.cycle.id !== q.id || q.action === "start" && saved.data.cycle.raftId !== q.id) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: saved.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
