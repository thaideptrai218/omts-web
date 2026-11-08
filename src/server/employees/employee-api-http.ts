import "server-only";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "./employee-session";
import { planEmployeeApi } from "./employee-api-plan";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
export async function handleEmployeeApi(request: Request): Promise<Response> {
  const gateway = getSessionGateway(), config = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (config.status !== "valid" || config.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let input: unknown;
    if (request.method === "POST") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      input = check.body.readForValidation();
    }
    const plan = planEmployeeApi(request.method, new URL(request.url).searchParams, input);
    if (!plan) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    if (context.context.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const controller = new AbortController(), abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, config.config.timeoutMs);
    try {
      if (request.signal.aborted) controller.abort();
      const response = await fetch(new URL(plan.path, config.config.origin), { method: plan.method, cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
        headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(plan.body ? { "Content-Type": "application/json" } : {}) }, body: plan.body ? JSON.stringify(plan.body) : undefined });
      const result = await readBackendResponse(response, plan.action === "create" ? "employeeCreate" : plan.action === "update" ? "employeeUpdate" : plan.action === "unlink" ? "employeeUnlink" : "profileRead");
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      if (request.signal.aborted || controller.signal.aborted) return json({ status: "unavailable" }, 503);
      if (result.status === "http-error") return json({ status: "rejected", code: result.code, ...(result.employeeProblem ? { employeeProblem: result.employeeProblem } : {}) }, result.httpStatus);
      if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "invalid-response" }, 502);
      const parsed = plan.schema.safeParse(result.data);
      if (!parsed.success) return json({ status: "invalid-response" }, 502);
      const data = parsed.data as Record<string, unknown>, employee = (data.employee ?? data) as Record<string, unknown>;
      if (plan.id && employee.id !== plan.id) return json({ status: "invalid-response" }, 502);
      if ("employee" in data) delete data.message;
      return json({ status: "success", data: "employee" in data && !["end-employment", "reinstate"].includes(plan.action) ? employee : data });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
