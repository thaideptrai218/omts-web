import "server-only";
import { inboxSchema, inboxCommandSchema } from "@/features/inbox-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleInbox(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (!["GET", "POST"].includes(request.method)) return json({ status: "rejected" }, 405);
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => key !== "page") || query.getAll("page").length > 1 || query.has("page") && !/^[1-9]\d{0,5}$/.test(query.get("page")!)) return json({ status: "invalid-input" }, 400);
  try {
    let path = `/api/me/notifications?page=${query.get("page") ?? "1"}&pageSize=20`;
    if (request.method === "POST") {
      if (query.size) return json({ status: "invalid-input" }, 400);
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 1024, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const command = inboxCommandSchema.safeParse(check.body.readForValidation());
      if (!command.success) return json({ status: "invalid-input" }, 400);
      path = command.data.action === "read-all" ? "/api/me/notifications/read-all" : `/api/me/notifications/${command.data.id}/read`;
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(path, backend.config.origin), { method: request.method, credentials: "omit", redirect: "error", cache: "no-store", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = response.status === 204 && request.method === "POST" ? undefined : await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (!result) return json({ status: "success", data: { saved: true } });
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || request.method !== "GET" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const parsed = inboxSchema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
