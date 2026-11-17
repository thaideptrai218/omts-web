import "server-only";
import { operationAllowed } from "@/features/operations/permissions";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { localFileTarget } from "../operations/evidence-target";
import { readBoundedBytes } from "../operations/bounded-body";
import { planNursery } from "./nursery-plan";
import { nurseryBrowserPhotos, nurseryDetail, type NurseryDetail } from "./nursery-response-schemas";
import { readNurseryUpload, validationProblem } from "./nursery-upload";
import { readNurseryProblem } from "./nursery-problem";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: responseHeaders });
export async function handleNurseryRequest(request: Request): Promise<Response> {
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  // Keep the API variant narrowed inside the relay closure as well.
  const config = backend.config;
  const plan = planNursery(request.method, new URL(request.url).searchParams);
  if (!plan) return json({ status: "invalid-input", code: "MSG-GEN-01" }, 400);
  try {
    if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = csrf.guard.checkHeaders(request, "POST");
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const application = await gateway.application(request.headers.get("cookie"));
    if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = application.context;
    const allowed = (zoneId?: string) => operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, plan.permission, zoneId);
    if (!allowed(plan.zoneId)) return json({ status: "forbidden", code: "MSG-GEN-08" }, 403);
    let body: FormData | string | undefined;
    if (plan.multipart) {
      const input = await readNurseryUpload(request, plan);
      if (!input.body) return json({ status: "invalid-input", code: "MSG-GEN-01", problem: input.problem }, 400);
      body = input.body;
    } else if (plan.validator) {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
      const parsed = plan.validator.safeParse(checked.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG-GEN-01", problem: validationProblem(parsed.error.issues[0]?.path[0], parsed.error.issues[0]?.message) }, 400);
      body = JSON.stringify(parsed.data);
    }
    const controller = new AbortController(), abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, Math.max(20_000, config.timeoutMs));
    const fetchBackend = (path: string, method = "GET", payload?: FormData | string) => fetch(new URL(path, config.origin), {
      method, body: payload, credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(typeof payload === "string" ? { "Content-Type": "application/json" } : {}) },
    });
    try {
      if (request.signal.aborted) controller.abort();
      // Resolve the actual zone before a record mutation/history read: a forged zoneId cannot satisfy the BFF gate.
      if (plan.id && (plan.method !== "GET" || plan.action === "history")) {
        const source = await fetchBackend(`/api/nursery-batches/${plan.id}`);
        if (!source.ok) return json({ status: "rejected", problem: await readNurseryProblem(source, controller.signal) }, source.status);
        const result = await readBackendResponse(source, "profileRead");
        const record = result.status === "success" ? nurseryDetail.safeParse(result.data) : undefined;
        if (!record?.success) return json({ status: "invalid-response" }, 502);
        if (record.data.zoneId !== plan.zoneId || !allowed(record.data.zoneId)) return json({ status: "forbidden", code: "MSG-GEN-08" }, 403);
      }
      const upstream = await fetchBackend(plan.path, plan.method, body);
      if (!upstream.ok) {
        const problem = await readNurseryProblem(upstream, controller.signal);
        return json({ status: "rejected", code: problem?.code, problem }, upstream.status);
      }
      const result = await readBackendResponse(upstream, "profileRead");
      if (result.status !== "success") return json({ status: "invalid-response" }, 502);
      const parsed = plan.schema.safeParse(result.data);
      if (!parsed.success) return json({ status: "invalid-response" }, 502);
      const data = parsed.data as Record<string, unknown>;
      const batch = (data.batch ?? (["detail", "photo"].includes(plan.action) ? data : undefined)) as NurseryDetail | undefined;
      if (batch && (plan.id && batch.id !== plan.id || plan.zoneId && batch.zoneId !== plan.zoneId || !allowed(batch.zoneId))) return json({ status: "invalid-response" }, 502);
      let bytes: Uint8Array | undefined, contentType: string | undefined;
      if (plan.action === "photo" && batch) {
        const photos = plan.stage === "start" ? batch.startPhotos : batch.completionPhotos;
        const target = localFileTarget(photos.find(photo => photo.id === plan.photoId)?.url, config.origin);
        if (!target) return json({ status: "not-found" }, 404);
        const file = await fetch(target, { credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal });
        contentType = file.headers.get("content-type")?.split(";")[0];
        if (!file.ok || !["image/jpeg", "image/png"].includes(contentType ?? "")) return json({ status: "unavailable" }, 503);
        bytes = await readBoundedBytes(file.body, controller.signal, 11 * 1024 * 1024, 15_000);
      }
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      if (request.signal.aborted || controller.signal.aborted) return json({ status: "unavailable" }, 503);
      if (bytes) return new Response(bytes as BodyInit, { headers: { ...responseHeaders, "Content-Type": contentType!, "Content-Disposition": `inline; filename="anh-uom.${contentType === "image/png" ? "png" : "jpg"}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
      return json({ status: "success", data: batch ? nurseryBrowserPhotos(batch) : data });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
