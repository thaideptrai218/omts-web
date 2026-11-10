import "server-only";
import { z } from "zod";
import { deviceListSchema, deviceViewSchema, revokeDeviceRequestSchema, revokeOthersResultSchema } from "@/features/device-sessions-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { createSessionCookieHelpers } from "../auth/session-cookies";
import { epochMilliseconds } from "../auth/session-refresh";
import { createBffHeaders } from "../backend/backend-transport";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import type { BackendTransportResult } from "../backend/backend-result";
import { sameEmployeeSession } from "../employees/employee-session";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
type Action = "list" | "revoke" | "revoke-others";

// .NET emits sub-millisecond precision; hand the browser plain millisecond ISO strings.
const isoTime = (value: string) => new Date(epochMilliseconds(value)).toISOString();

/**
 * The signed-in account's own sessions grouped by device ("Thiết bị đang đăng nhập"). The API scopes every
 * call to the caller's account, so nothing here chooses an account. A revoke that ends the session making
 * the request clears the session cookies in the same response.
 */
export async function handleDeviceSessions(request: Request, action: Action): Promise<Response> {
  const gateway = getSessionGateway();
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env), sessionCookies = createSessionCookieHelpers(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api" || sessionCookies.status !== "available") return json({ status: "unavailable" }, 503);
  const config = backend.config;
  if (new URL(request.url).search) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const cookieHeader = request.headers.get("cookie");
    let revoke: z.infer<typeof revokeDeviceRequestSchema> | undefined;
    if (action !== "list") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = await guard.guard.check(request, action === "revoke"
        ? { method: "POST", body: "json", maxBytes: 1024, timeoutMs: 5000 } : { method: "POST", body: "none", timeoutMs: 5000 });
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
      if (action === "revoke") {
        const parsed = revokeDeviceRequestSchema.safeParse("body" in checked ? checked.body.readForValidation() : undefined);
        if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
        revoke = parsed.data;
      }
    }
    const initial = await gateway.resolve(cookieHeader);
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const session = initial.session;
    const client = gateway.clientMeta(request.headers), bffHeaders = createBffHeaders(process.env);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(15_000, config.timeoutMs))]);
    async function upstream(method: "GET" | "POST" | "DELETE", path: string): Promise<BackendTransportResult> {
      const response = await fetch(new URL(path, config.origin), { method, credentials: "omit", redirect: "error", cache: "no-store", signal,
        headers: { Accept: "application/json", Authorization: `Bearer ${session.readAccessTokenForBackend()}`, ...bffHeaders(client) } });
      if (response.status === 204) { void response.body?.cancel().catch(() => undefined); return { status: "success", httpStatus: 204, data: undefined }; }
      return readBackendResponse(response, "profileRead");
    }
    async function sameSession() {
      const current = await gateway.resolve(cookieHeader);
      return current.status === "resolved" && sameEmployeeSession(session, current.session);
    }
    const refused = (result: Extract<BackendTransportResult, { status: "http-error" }>) => json({ status: "rejected", code: result.code }, result.httpStatus);

    if (action === "list") {
      const result = await upstream("GET", "/api/me/devices");
      if (!await sameSession()) return json({ status: "session-expired" }, 401);
      if (result.status === "http-error") return refused(result);
      const devices = result.status === "success" && result.httpStatus === 200 ? deviceListSchema.safeParse(result.data) : undefined;
      if (!devices) return json({ status: "unavailable" }, 503);
      if (!devices.success) return json({ status: "invalid-response" }, 502);
      return json({ status: "success", data: devices.data.map((device) => deviceViewSchema.parse({
        ...device, firstSignedInAt: isoTime(device.firstSignedInAt), lastActiveAt: isoTime(device.lastActiveAt) })) });
    }

    if (action === "revoke-others") {
      const result = await upstream("POST", "/api/me/sessions/revoke-others");
      if (!await sameSession()) return json({ status: "session-expired" }, 401);
      if (result.status === "http-error") return refused(result);
      const count = result.status === "success" && result.httpStatus === 200 ? revokeOthersResultSchema.safeParse(result.data) : undefined;
      if (!count) return json({ status: "unavailable" }, 503);
      return count.success ? json({ status: "success", data: count.data }) : json({ status: "invalid-response" }, 502);
    }

    if (!revoke) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const result = await upstream("DELETE", "deviceKey" in revoke ? `/api/me/devices/${revoke.deviceKey}` : `/api/me/sessions/${revoke.sessionId}`);
    if (!await sameSession()) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return refused(result);
    if (result.status !== "success" || result.httpStatus !== 204) return json({ status: "unavailable" }, 503);
    // Whether the request's own session was among those ended is asked of the API: a revoked session answers 401 at once.
    let signedOut = "sessionId" in revoke && revoke.sessionId.toLowerCase() === session.identity.backendSessionId.toLowerCase();
    if (!signedOut) {
      const probe = await upstream("GET", "/api/me").catch((): BackendTransportResult => ({ status: "unavailable" }));
      signedOut = probe.status === "http-error" && probe.httpStatus === 401;
    }
    const response = json({ status: "success", data: { signedOut } });
    if (signedOut) for (const cookie of sessionCookies.cookies.clear()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch { return json({ status: "unavailable" }, 503); }
}
