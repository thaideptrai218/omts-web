import "server-only";
import { z } from "zod";
import { cultivationLog, logInput, logTypes } from "@/features/cycles-api/log-contracts";
import { logPageSchema, logSortKeys } from "@/features/cultivation-logs/log-page-contract";
import { idList } from "../operations/sales-report-plan";
import { createCsrfGuard } from "../auth/csrf-guard";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBackendResponse } from "../backend/backend-response";
import { readOperationUpload } from "../operations/bounded-body";
export async function handleCultivationLogs(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  if (new URL(request.url).searchParams.get("action") === "page") return handleLogPage(request, json);
  const query = new URL(request.url).searchParams, q = z.strictObject({ action: z.enum(["list", "create", "raft-list", "raft-create", "correct", "remove"]), id: z.guid() }).safeParse(Object.fromEntries(query));
  if (!q.success || query.size !== 2 || (request.method === "GET") !== (q.data.action === "list" || q.data.action === "raft-list") || !["GET","POST"].includes(request.method)) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    const application = await gateway.application(request.headers.get("cookie")); if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    // "raft-…" read and write the logs of a raft (with or without a cycle); "list"/"create" keep the logs of one cycle.
    const { action, id } = q.data, reading = action === "list" || action === "raft-list", creating = action === "create" || action === "raft-create";
    const permission = reading ? "View" : creating ? "Create" : "Edit";
    if (application.context.identity.subjectType !== "CooperativeOwner" && !application.context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_LOGS" && p.action === permission)) return json({ status: "forbidden", code: "MSG02" }, 403);
    let body: BodyInit | undefined; let contentType: string | undefined;
    if (!reading) {
      const guard = createCsrfGuard(process.env); if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      if (action === "remove") {
        const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const input = z.strictObject({ reason: z.string().trim().min(1) }).safeParse(check.body.readForValidation()); if (!input.success) return json({ status: "invalid-input" }, 400);
        body = JSON.stringify(input.data); contentType = "application/json";
      } else {
        const check = guard.guard.checkHeaders(request, "POST"); if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const upload = await readOperationUpload(request, false, { optionalFile: action === "correct" });
        const input = logInput.safeParse(upload?.payload);
        if (!upload || !input.success || upload.files.some(f => !["image/jpeg","image/png"].includes(f.type))) return json({ status: "invalid-input" }, 400);
        const form = new FormData(); form.set("visitDate", input.data.visitDate); if (input.data.logType) form.set("logType", input.data.logType); if (input.data.notes) form.set("notes", input.data.notes);
        if (action === "correct") { if (!input.data.reason?.trim()) return json({ status: "invalid-input" }, 400); form.set("reason", input.data.reason); for (const key of input.data.keepPhotoKeys ?? []) form.append("keepPhotoKeys", key); }
        for (const file of upload.files) form.append("photos", file, file.name); body = form;
      }
    }
    const path = action === "raft-list" || action === "raft-create" ? `/api/rafts/${id}/cultivation-logs`
      : action === "list" || action === "create" ? `/api/cultivation-cycles/${id}/cultivation-logs` : `/api/cultivation-logs/${id}${action === "remove" ? "/remove" : ""}`;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(60_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(path, backend.config.origin), { method: reading ? "GET" : action === "correct" ? "PUT" : "POST", body, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(contentType ? { "Content-Type": contentType } : {}) }, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = action === "remove" && response.status === 204 ? undefined : await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie")); if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (!result) return json({ status: "success", data: { removed: true } });
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success") return json({ status: "unavailable" }, 503);
    const parsed = (reading ? z.array(cultivationLog) : z.object({ log: cultivationLog })).safeParse(result.data);
    if (!parsed.success) return json({ status: "invalid-response" }, 502);
    const logs = Array.isArray(parsed.data) ? parsed.data : [parsed.data.log];
    if (logs.some(log => action === "raft-list" || action === "raft-create" ? log.raftId !== id : action === "list" || action === "create" ? log.cycleId !== id : log.id !== id)) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: parsed.data });
  } catch { return json({ status: "unavailable" }, 503); }
}

const pageQuery = z.strictObject({ action: z.literal("page"), zoneId: z.guid().optional(), zoneIds: idList.optional(), raftId: z.guid().optional(), logType: z.enum(logTypes.map(([code]) => code)).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(), search: z.string().trim().max(100).optional(), sortBy: z.enum(logSortKeys).optional(), sortDir: z.enum(["asc", "desc"]).optional(), page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "20", "50", "100"]).optional() });
/** The Nhật ký screen: one server-paged page of the care logs of every zone the account may read, newest visit first unless `sortBy` (a column of the list) and `sortDir` say otherwise, with the filters of the screen. */
async function handleLogPage(request: Request, json: (data: unknown, status?: number) => Response) {
  const query = new URL(request.url).searchParams, q = pageQuery.safeParse(Object.fromEntries(query));
  if (!q.success || request.method !== "GET" || query.size !== [...new Set(query.keys())].length || (q.data.from && q.data.to && q.data.from > q.data.to) || (q.data.zoneId && q.data.zoneIds)) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    const application = await gateway.application(request.headers.get("cookie")); if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    if (application.context.identity.subjectType !== "CooperativeOwner" && !application.context.permissions.functionPermissions.some(p => p.functionCode === "CULTIVATION_LOGS" && p.action === "View")) return json({ status: "forbidden", code: "MSG02" }, 403);
    const { zoneIds, ...rest } = q.data, params = new URLSearchParams(); for (const [key, value] of Object.entries(rest)) if (key !== "action" && value) params.set(key, value);
    // Several zones of the header: the backend intersects them with the zones the caller may read.
    for (const zone of zoneIds ?? []) params.append("zoneIds", zone);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(30_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(`/api/cultivation-logs${params.size ? `?${params}` : ""}`, backend.config.origin), { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie")); if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success") return json({ status: "unavailable" }, 503);
    const parsed = logPageSchema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
