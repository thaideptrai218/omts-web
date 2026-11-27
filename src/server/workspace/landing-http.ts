import "server-only";
import { z } from "zod";
import { addPhotoSchema, exampleInvoiceSchema, landingSettingsSchema, removePhotoSchema } from "@/features/landing-admin/contracts";
import { createCsrfGuard } from "../auth/csrf-guard";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { readBackendResponse } from "../backend/backend-response";
import { parseServerBackendConfig } from "../config/backend-config";
import { sameEmployeeSession } from "../employees/employee-session";
import { readOperationUpload } from "../operations/bounded-body";
import { resolvePhotoSource } from "../public/origin-photo-source";

const actions = z.enum(["get", "add", "remove", "example"]);

/** BFF của màn "Trang giới thiệu" (chỉ chủ hợp tác xã): đọc, thêm/xóa ảnh, chọn hóa đơn mẫu. */
export async function handleLanding(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const action = actions.safeParse(new URL(request.url).searchParams.get("action"));
  if (!action.success || (request.method === "GET") !== (action.data === "get") || !["GET", "POST"].includes(request.method)) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, 401);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    let method = "GET", path = "/api/cooperative/landing", body: BodyInit | undefined;
    const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` };
    if (action.data !== "get") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      if (action.data === "add") {
        const check = csrf.guard.checkHeaders(request, "POST");
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const upload = await readOperationUpload(request, true, { maxFiles: 1, maxBytes: 6 * 1024 * 1024 }), input = addPhotoSchema.safeParse(upload?.payload);
        if (!upload || !input.success) return json({ status: "invalid-input" }, 400);
        const form = new FormData();
        form.set("section", input.data.section);
        if (input.data.caption) form.set("caption", input.data.caption);
        form.set("file", upload.files[0], upload.files[0].name);
        method = "POST"; path += "/photos"; body = form;
      } else {
        const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 4096, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        const value = check.body.readForValidation();
        if (action.data === "remove") {
          const input = removePhotoSchema.safeParse(value);
          if (!input.success) return json({ status: "invalid-input" }, 400);
          method = "DELETE"; path += `/photos/${input.data.id}`;
        } else {
          const input = exampleInvoiceSchema.safeParse(value);
          if (!input.success) return json({ status: "invalid-input" }, 400);
          method = "PUT"; path += "/example-invoice"; body = JSON.stringify(input.data); headers["Content-Type"] = "application/json";
        }
      }
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(60_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(path, backend.config.origin), { method, body, headers, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || signal.aborted) return json({ status: "unavailable" }, 503);
    const data = landingSettingsSchema.safeParse(result.data);
    if (!data.success) return json({ status: "invalid-response" }, 502);
    // Ảnh đi qua proxy ảnh công khai: trình duyệt không biết origin backend.
    const origin = backend.config.origin;
    return json({ status: "success", data: { ...data.data, photos: data.data.photos.map((photo) => ({ ...photo, url: resolvePhotoSource(photo.url, origin) ?? "" })) } });
  } catch { return json({ status: "unavailable" }, 503); }
}
