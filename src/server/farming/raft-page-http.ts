import "server-only";
import { z } from "zod";
import { resourceAllowed } from "@/features/api-workspace/resources";
import { raftPageSchema } from "@/features/rafts-api/raft-page-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

const number = /^[1-9]\d{0,6}$/, allowedKeys = ["zoneId", "statusId", "search", "page", "pageSize"];

/** Server-paged raft list of one zone: the backend does the filtering, ordering and paging; only allow-listed query parameters pass. */
export async function handleRaftPage(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (request.method !== "GET") return json({ status: "rejected" }, 405);
  const query = new URL(request.url).searchParams, keys = [...query.keys()];
  const zoneId = z.guid().safeParse(query.get("zoneId"));
  if (new Set(keys).size !== keys.length || keys.some(key => !allowedKeys.includes(key)) || !zoneId.success
    || ["statusId", "page", "pageSize"].some(key => query.has(key) && !number.test(query.get(key) ?? "")) || (query.get("search")?.length ?? 0) > 200
    || Number(query.get("pageSize") ?? 20) > 100) return json({ status: "invalid-input" }, 400);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    if (!resourceAllowed("rafts", context.context.identity, context.context.permissions.functionPermissions, "View")) return json({ status: "forbidden", code: "MSG02" }, 403);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const url = new URL("/api/rafts", backend.config.origin);
    for (const key of allowedKeys) if (query.has(key)) url.searchParams.set(key, query.get(key)!);
    const response = await fetch(url, { cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const parsed = raftPageSchema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
