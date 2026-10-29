import "server-only";
import { cooperativeInputSchema, cooperativeWireSchema } from "@/features/cooperative-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes } from "../operations/bounded-body";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
const types = ["image/png", "image/jpeg", "image/webp"];
// Never accept a browser-controlled URL or an arbitrary backend file category.
export function cooperativeLogoPath(value: string | null) {
  return value && /^\/api\/public\/cooperative\/logos\/[0-9]{4}\/[0-9]{2}\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(value) ? value : undefined;
}
async function logoUpload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "", length = request.headers.get("content-length");
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType) || request.headers.has("content-encoding") || length !== null && (!/^\d{1,12}$/.test(length) || Number(length) > 3 * 1024 * 1024)) return undefined;
  try {
    const bytes = await readBoundedBytes(request.body, request.signal, 3 * 1024 * 1024, 20_000);
    const form = await new Response(bytes as BodyInit, { headers: { "Content-Type": contentType } }).formData();
    const files = form.getAll("file");
    if ([...form.keys()].some((key) => key !== "file") || files.length !== 1) return undefined;
    const file = files[0];
    if (typeof file === "string" || file.size === 0 || file.size > 2 * 1024 * 1024 || !types.includes(file.type)) return undefined;
    const result = new FormData(); result.set("file", file, file.name); return result;
  } catch { return undefined; }
}
export async function handleCooperativeRequest(request: Request, logo = false): Promise<Response> {
  const gateway = getSessionGateway();
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  const method = request.method, writing = method !== "GET", params = new URL(request.url).searchParams;
  if (!(logo ? ["GET", "POST", "DELETE"] : ["GET", "PUT"]).includes(method) || [...params.keys()].some((key) => !logo || method !== "GET" || key !== "version") || params.getAll("version").length > 1 || (params.get("version")?.length ?? 0) > 128) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    let body: FormData | string | undefined;
    if (writing) {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      if (method === "POST") {
        const checked = guard.guard.checkHeaders(request, "POST");
        if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
        body = await logoUpload(request);
        if (!body) return json({ status: "invalid-input", code: "MSG01" }, 400);
      } else {
        const checked = await guard.guard.check(request, method === "PUT" ? { method: "PUT", body: "json", maxBytes: 16_384, timeoutMs: 5000 } : { method: "DELETE", body: "none", timeoutMs: 5000 });
        if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
        if (method === "PUT") {
          const values = cooperativeInputSchema.safeParse(checked.body.readForValidation());
          if (!values.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
          body = JSON.stringify(values.data);
        }
      }
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(15_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(`/api/cooperative/profile${logo && writing ? "/logo" : ""}`, backend.config.origin), { method: logo && !writing ? "GET" : method, body,
      cache: "no-store", credentials: "omit", redirect: "error", signal, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(typeof body === "string" ? { "Content-Type": "application/json" } : {}) } });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const raw = method === "PUT" && result.data && typeof result.data === "object" && "profile" in result.data ? result.data.profile : result.data;
    const parsed = cooperativeWireSchema.safeParse(raw);
    if (!parsed.success) return json({ status: "invalid-response" }, 502);
    const record = parsed.data, target = cooperativeLogoPath(record.logoUrl);
    if (record.logoUrl && !target) return json({ status: "invalid-response" }, 502);
    if (logo && !writing) {
      if (!target || params.has("version") && params.get("version") !== record.rowVersion) return json({ status: "not-found" }, 404);
      const file = await fetch(new URL(target, backend.config.origin), { cache: "no-store", credentials: "omit", redirect: "error", signal });
      const contentType = file.headers.get("content-type")?.split(";")[0];
      if (!file.ok || !types.includes(contentType ?? "")) return json({ status: "unavailable" }, 503);
      const bytes = await readBoundedBytes(file.body, signal, 2 * 1024 * 1024, 15_000);
      const after = await gateway.resolve(request.headers.get("cookie"));
      if (after.status !== "resolved" || !sameEmployeeSession(initial.session, after.session)) return json({ status: "session-expired" }, 401);
      if (signal.aborted || bytes.length === 0) return json({ status: "unavailable" }, 503);
      return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": contentType!, "Content-Security-Policy": "sandbox; default-src 'none'" } });
    }
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    return json({ status: "success", data: { ...record, logoUrl: target ? `/api/cooperative/profile/logo?version=${encodeURIComponent(record.rowVersion)}` : null } });
  } catch { return json({ status: "unavailable" }, 503); }
}
