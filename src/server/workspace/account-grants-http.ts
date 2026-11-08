import "server-only";
import { z } from "zod";
import { grantHistorySchema, permissionCatalogSchema, roleImpactSchema } from "@/features/personal-api/grant-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
const accessReads = {
  grants: { key: "accountId", schema: grantHistorySchema, path: (id: string) => `/api/accounts/${id}/grants` },
  functions: { key: null, schema: permissionCatalogSchema, path: () => "/api/permission-functions" },
  impact: { key: "roleId", schema: roleImpactSchema, path: (id: string) => `/api/roles/${id}/impact` },
} as const;
export const handleAccountGrantsRequest = (request: Request) => handleOwnerAccessRead(request, "grants");
export async function handleOwnerAccessRead(request: Request, area: keyof typeof accessReads) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (request.method !== "GET") return json({ status: "rejected" }, 405);
  const plan = accessReads[area], query = new URL(request.url).searchParams;
  const id = plan.key ? z.guid().safeParse(query.get(plan.key)) : undefined;
  if (plan.key ? !id?.success || [...query.keys()].length !== 1 || query.getAll(plan.key).length !== 1 : [...query.keys()].length !== 0) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(plan.path(id?.success ? id.data : ""), backend.config.origin), { cache: "no-store", credentials: "omit", redirect: "error", signal, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const parsed = plan.schema.safeParse(result.data);
    if (!parsed.success) return json({ status: "invalid-response" }, 502);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    return json({ status: "success", data: parsed.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
