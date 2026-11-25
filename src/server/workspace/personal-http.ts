import "server-only";
import { z } from "zod";
import { profileViewSchema, updateProfileRequestSchema } from "@/features/personal-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
export async function handlePersonalRequest(request: Request): Promise<Response> {
  const gateway = getSessionGateway();
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  const config = backend.config;
  if (!["GET", "PUT"].includes(request.method) || new URL(request.url).search) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const session = initial.session;
    let body: unknown;
    if (request.method === "PUT") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = await guard.guard.check(request, { method: "PUT", body: "json", maxBytes: 16_384, timeoutMs: 5000 });
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
      const parsed = updateProfileRequestSchema.safeParse(checked.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = parsed.data;
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(15_000, config.timeoutMs))]);
    const path = "/api/me/profile";
    async function upstream(method: "GET" | "PUT", payload?: unknown) {
      const response = await fetch(new URL(path, config.origin), { method, credentials: "omit", redirect: "error", cache: "no-store", signal,
        headers: { Accept: "application/json", Authorization: `Bearer ${session.readAccessTokenForBackend()}`, ...(payload ? { "Content-Type": "application/json" } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
      return readBackendResponse(response, "profileRead");
    }
    async function sameSession() {
      const current = await gateway.resolve(request.headers.get("cookie"));
      return current.status === "resolved" && sameEmployeeSession(session, current.session);
    }
    const result = await upstream(request.method as "GET" | "PUT", body);
    if (!await sameSession()) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const raw = body ? z.object({ profile: profileViewSchema }).safeParse(result.data) : profileViewSchema.safeParse(result.data);
    if (!raw.success) return json({ status: "invalid-response" }, 502);
    const profile = "profile" in raw.data ? raw.data.profile : raw.data;
    if (profile.accountId !== initial.session.identity.accountId || profile.subjectType !== initial.session.identity.subjectType) return json({ status: "invalid-response" }, 502);
    const data = profile;
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    return json({ status: "success", data });
  } catch { return json({ status: "unavailable" }, 503); }
}
