import "server-only";
import { z } from "zod";
import { zoneCycles, cycleHistory, cycleProgress, cycleInput, cycleView } from "@/features/cycles-api/contracts";
import { createCsrfGuard } from "../auth/csrf-guard";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleCycles(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const query = new URL(request.url).searchParams;
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
    if (initial.session.phase !== "application") return json({ status: "forbidden" }, 403);
    const application = await gateway.application(request.headers.get("cookie"));
    if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    if (application.context.identity.subjectType !== "CooperativeOwner" && !application.context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === "View")) return json({ status: "forbidden", code: "MSG02" }, 403);
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
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const csrf = createCsrfGuard(process.env); if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
    const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
    if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    const command = z.discriminatedUnion("action", [
      z.strictObject({ action: z.literal("start"), id: z.guid(), body: cycleInput }),
      z.strictObject({ action: z.literal("edit"), id: z.guid(), body: cycleInput.extend({ rowVersion: z.string().min(1) }) }),
      z.strictObject({ action: z.literal("cancel"), id: z.guid(), body: z.strictObject({ rowVersion: z.string().min(1) }) }),
    ]).safeParse(check.body.readForValidation());
    if (!command.success || new URL(request.url).search) return json({ status: "invalid-input" }, 400);
    const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    if (initial.session.phase !== "application") return json({ status: "forbidden" }, 403);
    const application = await gateway.application(request.headers.get("cookie")); if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    const q = command.data, permission = q.action === "start" ? "Create" : q.action === "edit" ? "Edit" : "Delete";
    if (application.context.identity.subjectType !== "CooperativeOwner" && !application.context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_CYCLES" && p.action === permission)) return json({ status: "forbidden", code: "MSG02" }, 403);
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
