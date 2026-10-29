import "server-only";
import { z } from "zod";
import { saveLicenseSchema } from "@/features/farming-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBoundedBytes, readOperationUpload } from "../operations/bounded-body";
import { localFileTarget } from "../operations/evidence-target";
import { planFarming, type FarmingArea } from "./farming-plan";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
export async function handleFarmingRequest(request: Request, area: FarmingArea): Promise<Response> {
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const plan = planFarming(area, request.method, new URL(request.url).searchParams);
    if (!plan) return json({ status: "invalid-input", code: "MSG01" }, 400);
    if (plan.upload) {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = guard.guard.checkHeaders(request, "POST");
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const subject = context.context.identity.subjectType;
    if (subject !== "CooperativeOwner" && (plan.ownerOnly || subject !== "Staff")) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (request.signal.aborted) return json({ status: "unavailable" }, 503);
    let body: FormData | undefined;
    if (plan.upload) {
      const input = await readOperationUpload(request, plan.upload === "photo", { maxFiles: 1, optionalFile: plan.action === "update", maxBytes: 12 * 1024 * 1024 });
      if (!input) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const values = (plan.upload === "license" ? saveLicenseSchema : z.strictObject({})).safeParse(input.payload);
      if (!values.success || plan.action === "update" && !("rowVersion" in values.data)) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = new FormData();
      for (const file of input.files) body.append("file", file, file.name);
      for (const [key, value] of Object.entries(values.data as Record<string, unknown>)) {
        if (Array.isArray(value)) for (const entry of value) body.append(key, String(entry));
        else if (value !== null && value !== undefined) body.set(key, String(value));
      }
    }
    const controller = new AbortController(), abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const budget = Math.max(15_000, backend.config.timeoutMs), timeout = setTimeout(abort, budget);
    try {
      if (request.signal.aborted) controller.abort();
      const upstream = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, body, cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
        headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
      const result = await readBackendResponse(upstream, "profileRead");
      if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
      if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
      const parsed = plan.schema.safeParse(result.data);
      if (!parsed.success) return json({ status: "invalid-response" }, 502);
      const record = parsed.data as Record<string, unknown>;
      let bytes: Uint8Array | undefined, contentType: string | undefined;
      if (plan.file) {
        const target = localFileTarget(record[plan.file], backend.config.origin);
        if (!target) return json({ status: "not-found" }, 404);
        const file = await fetch(target, { cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal });
        contentType = file.headers.get("content-type")?.split(";")[0];
        const allowed = area === "zone-licenses" ? ["image/jpeg", "image/png", "application/pdf"] : ["image/jpeg", "image/png"];
        if (!file.ok || !allowed.includes(contentType ?? "")) return json({ status: "unavailable" }, 503);
        bytes = await readBoundedBytes(file.body, controller.signal, 11 * 1024 * 1024, budget);
      }
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      if (request.signal.aborted || controller.signal.aborted) return json({ status: "unavailable" }, 503);
      if (bytes) return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": contentType!,
        "Content-Disposition": `${area === "raft-details" ? "inline" : "attachment"}; filename="${area}.${contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : "jpg"}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
      if (typeof record.id === "string") {
        if ("fileUrl" in record) record.fileUrl = record.fileUrl ? `/api/operations/zone-licenses?action=file&id=${record.id}` : null;
        if ("photoUrl" in record) record.photoUrl = record.photoUrl ? `/api/operations/raft-details?action=photo&id=${record.id}` : null;
      }
      return json({ status: "success", data: record });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
