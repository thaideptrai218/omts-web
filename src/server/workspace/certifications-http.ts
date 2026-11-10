import "server-only";
import { z } from "zod";
import { certificationInput, certificationSchema } from "@/features/certifications-api/contracts";
import { createCsrfGuard } from "../auth/csrf-guard";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBackendResponse } from "../backend/backend-response";
import { readOperationUpload } from "../operations/bounded-body";
export async function handleCertifications(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const query = new URL(request.url).searchParams, parsed = z.strictObject({ action: z.enum(["list","create","update","remove"]), id: z.guid().optional() }).safeParse(Object.fromEntries(query));
  if (!parsed.success || query.size !== new Set(query.keys()).size || !["GET","POST"].includes(request.method)) return json({ status: "invalid-input" }, 400);
  const { action, id } = parsed.data;
  if ((request.method === "GET") !== (action === "list") || (!!id !== ["update","remove"].includes(action))) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    let body: FormData | undefined; let version: string | undefined;
    if (action !== "list") {
      const csrf = createCsrfGuard(process.env); if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      if (action === "remove") {
        const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 4096, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const input = z.strictObject({ rowVersion: z.string().min(1) }).safeParse(check.body.readForValidation()); if (!input.success) return json({ status: "invalid-input" }, 400); version = input.data.rowVersion;
      } else {
        const check = csrf.guard.checkHeaders(request, "POST"); if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const upload = await readOperationUpload(request, false, { maxFiles: 1, optionalFile: action === "update", maxBytes: 11 * 1024 * 1024 }), input = certificationInput.safeParse(upload?.payload);
        if (!upload || !input.success || action === "update" && !input.data.rowVersion) return json({ status: "invalid-input" }, 400);
        body = new FormData(); for (const [key,value] of Object.entries(input.data)) if (value != null) body.set(key, value); if (upload.files[0]) body.set("file", upload.files[0], upload.files[0].name);
      }
    }
    const path = `/api/cooperative/certifications${id ? `/${id}` : ""}${version ? `?${new URLSearchParams({ rowVersion: version })}` : ""}`;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(60_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(path, backend.config.origin), { method: action === "list" ? "GET" : action === "remove" ? "DELETE" : action === "update" ? "PUT" : "POST", body, headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || signal.aborted) return json({ status: "unavailable" }, 503);
    const data = (action === "list" ? z.array(certificationSchema) : action === "remove" ? z.object({ message: z.string(), messageCode: z.string() }) : z.object({ certification: certificationSchema })).safeParse(result.data);
    if (!data.success || action === "update" && "certification" in data.data && data.data.certification.id !== id) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: data.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
