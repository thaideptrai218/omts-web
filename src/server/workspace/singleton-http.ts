import "server-only";
import { z } from "zod";
import { singletonDefinitions, type SingletonKey } from "@/features/api-workspace/singleton-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

export async function handleSingletonRequest(request: Request, key: SingletonKey) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
  const gateway = getSessionGateway();
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  const config = parseServerBackendConfig(process.env);
  if (config.status !== "valid" || config.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (key === "cooperative" && initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    let body: unknown;
    if (request.method !== "GET") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await guard.guard.check(request, { method: "PUT", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const input = z.record(z.string(), z.json()).safeParse(check.body.readForValidation());
      const allowed: string[] = [...singletonDefinitions[key].fields.map(([field]) => field), "rowVersion", ...(key === "cooperative" ? ["businessLines"] : [])];
      if (!input.success || Object.keys(input.data).some((field) => !allowed.includes(field))) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = input.data;
    }
    const response = await fetch(new URL(singletonDefinitions[key].path, config.config.origin), { method: request.method === "GET" ? "GET" : "PUT",
      credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(config.config.timeoutMs)]),
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    const upstream = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (upstream.status === "http-error") return json({ status: "rejected", code: upstream.code }, upstream.httpStatus);
    if (upstream.status !== "success") return json({ status: "unavailable" }, 503);
    const raw = key === "profile" && request.method !== "GET" && upstream.data && typeof upstream.data === "object" && "profile" in upstream.data ? upstream.data.profile : upstream.data;
    const projected = singletonDefinitions[key].schema.safeParse(raw);
    if (!projected.success) return json({ status: "invalid-response" }, 502);
    if (key === "profile" && "accountId" in projected.data && projected.data.accountId !== initial.session.identity.accountId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: projected.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
