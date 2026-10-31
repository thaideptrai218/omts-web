import "server-only";
import { zoneMapSchema } from "@/features/farming-api/zone-map-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

export async function handleZoneMap(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (request.method !== "GET") return json({ status: "rejected" }, 405);
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => key !== "includeDiscontinued") || query.getAll("includeDiscontinued").length > 1
    || query.has("includeDiscontinued") && !["true", "false"].includes(query.get("includeDiscontinued")!)) return json({ status: "invalid-input" }, 400);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (!["CooperativeOwner", "Staff"].includes(initial.session.identity.subjectType)) return json({ status: "forbidden", code: "MSG02" }, 403);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const url = new URL("/api/zones/map", backend.config.origin);
    url.searchParams.set("includeDiscontinued", query.get("includeDiscontinued") ?? "false");
    const response = await fetch(url, { cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const parsed = zoneMapSchema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
