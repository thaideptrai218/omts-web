import "server-only";
import { z } from "zod";
import { saveLicenseSchema } from "@/features/farming-api/contracts";
import { operationAllowed } from "@/features/operations/permissions";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { readFarmingProblem } from "../backend/farming-problem-copy";
import type { LaneIncident } from "@/features/rafts-api/lane-incident-contracts";
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
    // Every write (upload or delete) is CSRF-guarded; only reads skip it.
    if (plan.method !== "GET") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const check = guard.guard.checkHeaders(request, request.method === "PUT" ? "PUT" : "POST");
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const subject = context.context.identity.subjectType;
    if (subject !== "CooperativeOwner" && (plan.ownerOnly || subject !== "Staff")) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (plan.zoneId && plan.method !== "GET" && !operationAllowed("cultivation-cycles", context.context.identity, context.context.permissions.functionPermissions, "Edit", plan.zoneId)) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (request.signal.aborted) return json({ status: "unavailable" }, 503);
    let body: FormData | string | undefined;
    if (plan.jsonBody) {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = await guard.guard.check(request, { method: request.method === "PUT" ? "PUT" : "POST", body: "json", maxBytes: 16_384, timeoutMs: 5000 });
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
      const values = plan.jsonBody.safeParse(checked.body.readForValidation());
      if (!values.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = JSON.stringify(values.data);
    }
    if (plan.upload) {
      const damage = plan.upload === "lane-damage";
      const input = await readOperationUpload(request, !damage && plan.upload !== "license", { maxFiles: damage ? 3 : 1, optionalFile: plan.action === "update", maxBytes: (damage ? 31 : 12) * 1024 * 1024 });
      if (!input) return json({ status: "invalid-input", code: damage ? "MSG-GEN-01" : "MSG01", ...(damage ? { problem: { field: "Photos", hint: "Cần từ 1 đến 3 ảnh JPEG hoặc PNG, mỗi ảnh không quá 10 MB." } } : {}) }, 400);
      const values = (plan.uploadBody ?? (plan.upload === "license" ? saveLicenseSchema : z.strictObject({}))).safeParse(input.payload);
      if (!values.success || plan.action === "update" && !("rowVersion" in (values.data as object))) return json({ status: "invalid-input", code: "MSG01" }, 400);
      body = new FormData();
      for (const file of input.files) {
        if (damage && !["image/jpeg", "image/png"].includes(file.type)) return json({ status: "invalid-input", code: "MSG-GEN-01", problem: { field: "Photos", hint: "Chỉ nhận ảnh JPEG hoặc PNG." } }, 400);
        body.append(damage ? "photos" : "file", file, file.name);
      }
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
        headers: { Accept: "application/json", ...(typeof body === "string" ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` } });
      // The photo command documents a 201 without a JSON shape. Still perform the session recheck below.
      const problemCopy = !upstream.ok && plan.action.startsWith("lane-") ? upstream.clone() : undefined;
      if (plan.action === "lane-photo" && upstream.status === 201) void upstream.body?.cancel().catch(() => undefined);
      const result = plan.action === "lane-photo" && upstream.status === 201
        ? { status: "success" as const, httpStatus: 201, data: { done: true } } : await readBackendResponse(upstream, "profileRead");
      if (result.status === "http-error") return json({ status: "rejected", code: result.code, ...(problemCopy ? { problem: await readFarmingProblem(problemCopy) } : {}) }, result.httpStatus);
      if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
      const parsed = plan.schema.safeParse(result.data);
      if (!parsed.success) return json({ status: "invalid-response" }, 502);
      const record = (plan.unwrap ? (parsed.data as Record<string, unknown>)[plan.unwrap] : parsed.data) as Record<string, unknown>;
      let bytes: Uint8Array | undefined, contentType: string | undefined;
      if (plan.file) {
        const source = plan.file === "incident-photo" ? (record.incidents as LaneIncident[]).find(incident => incident.id === plan.incidentId)?.photos?.[plan.photoIndex!]?.url
          : plan.photoId ? (record.photos as { id: string; url: string }[]).find((photo) => photo.id === plan.photoId)?.url : record[plan.file];
        const target = localFileTarget(source, backend.config.origin);
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
        if (Array.isArray(record.photos)) record.photos = (record.photos as { id: string }[]).map((photo) => ({ ...photo, url: `/api/operations/raft-details?action=photo&id=${record.id}&photoId=${photo.id}` }));
      }
      if (Array.isArray(record.incidents)) record.incidents = (record.incidents as LaneIncident[]).map(incident => ({ ...incident,
        photos: incident.photos?.map((photo, index) => ({ ...photo, url: photo.url ? `/api/operations/raft-details?${new URLSearchParams({ action: "lane-photo-view", id: new URL(request.url).searchParams.get("id")!, zoneId: plan.zoneId!, laneNumber: String(incident.laneNumber), incidentId: incident.id, photoIndex: String(index) })}` : undefined })) }));
      return json({ status: "success", data: record });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
