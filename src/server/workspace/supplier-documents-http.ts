import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { supplierDocumentsSchema } from "@/features/supplier-api/contracts";
import { resourceAllowed } from "@/features/api-workspace/resources";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readOperationUpload, readBoundedBytes } from "../operations/bounded-body";
import { localFileTarget } from "../operations/evidence-target";
export function certificateTarget(raw: string, origin: string) {
  const target = localFileTarget(raw, origin);
  return target?.pathname.startsWith("/api/files/local/supplier-certificates/") ? { target, fingerprint: createHash("sha256").update(target.pathname).digest("hex") } : undefined;
}
export async function handleSupplierDocuments(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  const origin = backend.config.origin;
  const query = new URL(request.url).searchParams;
  const parsed = z.strictObject({ id: z.guid(), index: z.string().regex(/^[0-9]$/).optional(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional() }).safeParse(Object.fromEntries(query));
  if (!parsed.success || new Set(query.keys()).size !== [...query.keys()].length || !["GET", "POST"].includes(request.method) || (parsed.data.index === undefined) !== (parsed.data.fingerprint === undefined) || request.method === "POST" && parsed.data.index !== undefined) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env); if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const check = csrf.guard.checkHeaders(request, "POST"); if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "unavailable" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const allowed = (action: string) => resourceAllowed("suppliers", context.context.identity, context.context.permissions.functionPermissions, action);
    if (!allowed("View") || request.method === "POST" && !allowed("Edit")) return json({ status: "forbidden", code: "MSG02" }, 403);
    let body: FormData | undefined;
    if (request.method === "POST") {
      const upload = await readOperationUpload(request, false);
      if (!upload || !z.strictObject({}).safeParse(upload.payload).success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = new FormData(); for (const file of upload.files) body.append("files", file, file.name);
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(`/api/suppliers/${parsed.data.id}${body ? "/certificates" : ""}`, origin), { method: body ? "POST" : "GET", body, cache: "no-store", redirect: "error", credentials: "omit", signal, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== 200) return json({ status: "unavailable" }, 503);
    const supplier = supplierDocumentsSchema.safeParse(result.data);
    if (!supplier.success || supplier.data.id !== parsed.data.id) return json({ status: "invalid-response" }, 502);
    if (parsed.data.index !== undefined) {
      const file = supplier.data.certificates[Number(parsed.data.index)], target = file && certificateTarget(file.url, origin);
      if (!target || target.fingerprint !== parsed.data.fingerprint) return json({ status: "rejected", code: "MSG06" }, 409);
      const upstream = await fetch(target.target, { cache: "no-store", credentials: "omit", redirect: "error", signal });
      const type = upstream.headers.get("content-type")?.split(";")[0];
      if (!upstream.ok || !["image/jpeg", "image/png", "application/pdf"].includes(type ?? "")) return json({ status: "invalid-response" }, 502);
      const bytes = await readBoundedBytes(upstream.body, signal, 10 * 1024 * 1024, 20_000);
      const last = await gateway.resolve(request.headers.get("cookie"));
      if (last.status !== "resolved" || !sameEmployeeSession(initial.session, last.session) || signal.aborted) return json({ status: "session-expired" }, 401);
      return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": type!, "Content-Disposition": `attachment; filename="supplier-certificate.${type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg"}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
    }
    supplier.data.certificates = supplier.data.certificates.map((file) => {
      const target = certificateTarget(file.url, origin);
      return { index: file.index, url: target ? `/api/supplier-documents?id=${supplier.data.id}&index=${file.index}&fingerprint=${target.fingerprint}` : "" };
    });
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    return json({ status: "success", data: supplier.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
