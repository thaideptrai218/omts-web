import "server-only";
import { z } from "zod";
import { adminAccount, adminActivity, adminPage, adminStatusChange } from "@/features/admin-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleAdmin(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    if (initial.session.identity.subjectType !== "SystemAdministrator") return json({ status: "forbidden" }, 403);
    const query = new URL(request.url).searchParams;
    let path = "/api/admin/accounts", body;
    let schema: z.ZodType = adminPage;
    if (request.method === "POST") {
      if (query.size) return json({ status: "invalid-input" }, 400);
      const guard = createCsrfGuard(process.env); if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 4096, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const parsed = adminStatusChange.safeParse(check.body.readForValidation()); if (!parsed.success) return json({ status: "invalid-input" }, 400);
      path += `/${parsed.data.id}/${parsed.data.action}`; body = { reason: parsed.data.reason, rowVersion: parsed.data.rowVersion }; schema = adminAccount;
    } else {
      const parsed = z.strictObject({ id: z.guid().optional(), activity: z.literal("1").optional(), search: z.string().max(200).optional(), type: adminAccount.shape.subjectType.optional(), statusId: z.enum(["301", "302"]).optional(), page: z.string().regex(/^[1-9]\d{0,4}$/).optional() }).safeParse(Object.fromEntries(query));
      if (!parsed.success || new Set(query.keys()).size !== query.size) return json({ status: "invalid-input" }, 400);
      if (parsed.data.id) { if (query.size !== 1) return json({ status: "invalid-input" }, 400); path += `/${parsed.data.id}`; schema = adminAccount; }
      else if (parsed.data.activity) { if (query.size !== 1) return json({ status: "invalid-input" }, 400); path += "/activity"; schema = adminActivity; }
      else path += `?${query}`;
    }
    const response = await fetch(new URL(path, backend.config.origin), { method: request.method, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]) });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.httpStatus === 409 ? "MSG06" : result.code }, result.httpStatus);
    if (result.status !== "success") return json({ status: "invalid-response" }, 502);
    const parsed = schema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
