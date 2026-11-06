import "server-only";
import { revokeGrantSchema, grantRowSchema } from "@/features/personal-api/grant-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleAccountGrantRevoke(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (new URL(request.url).search) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const guard = createCsrfGuard(process.env);
    if (guard.status !== "available") return json({ status: "unavailable" }, 503);
    const checked = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 });
    if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
    const parsed = revokeGrantSchema.safeParse(checked.body.readForValidation());
    if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const { accountId, grantId, reason } = parsed.data;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(`/api/accounts/${accountId}/grants/${grantId}/revoke`, backend.config.origin), { method: "POST", credentials: "omit", redirect: "error", cache: "no-store", signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, body: JSON.stringify({ reason }) });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const row = grantRowSchema.safeParse(result.data);
    if (!row.success || row.data.id !== grantId || row.data.state !== "Revoked") return json({ status: "invalid-response" }, 502);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    return json({ status: "success", data: row.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
