import "server-only";
import { traderDecisionSchema, traderRequestSchema, traderRequestsSchema } from "@/features/trader-requests-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

export async function handleTraderRequests(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (!["GET", "POST"].includes(request.method)) return json({ status: "rejected" }, 405);
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => key !== "rejected") || query.getAll("rejected").length > 1 || query.has("rejected") && !["true", "false"].includes(query.get("rejected")!)) return json({ status: "invalid-input" }, 400);
  try {
    let command: ReturnType<typeof traderDecisionSchema.parse> | undefined;
    if (request.method === "POST") {
      if (query.size) return json({ status: "invalid-input" }, 400);
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const parsed = traderDecisionSchema.safeParse(check.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      command = parsed.data;
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const path = command ? `/api/trader-requests/${command.accountId}/${command.action}` : `/api/trader-requests?rejected=${query.get("rejected") ?? "false"}`;
    const payload = command?.action === "reject" ? { reason: command.reason } : undefined;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(path, backend.config.origin), { method: request.method, credentials: "omit", redirect: "error", cache: "no-store", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(payload ? { "Content-Type": "application/json" } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    if (command) {
      const parsed = traderRequestSchema.safeParse(result.data);
      if (!parsed.success || parsed.data.accountId !== command.accountId || parsed.data.status !== (command.action === "approve" ? "ACTIVE" : "REJECTED")) return json({ status: "invalid-response" }, 502);
      return json({ status: "success", data: parsed.data });
    }
    const parsed = traderRequestsSchema.safeParse(result.data), status = query.get("rejected") === "true" ? "REJECTED" : "PENDING_APPROVAL";
    return parsed.success && parsed.data.every((row) => row.status === status) ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
