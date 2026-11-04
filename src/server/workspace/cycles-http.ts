import "server-only";
import { z } from "zod";
import { zoneCycles, cycleHistory, cycleProgress } from "@/features/cycles-api/contracts";
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
