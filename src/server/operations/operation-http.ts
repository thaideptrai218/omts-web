import "server-only";
import { z } from "zod";
import { operationAreas, operationAllowed } from "@/features/operations/permissions";
import * as c from "@/features/operations/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
import { planOperation, type OperationPlan } from "./operation-plan";
import { readBoundedBytes, readOperationUpload } from "./bounded-body";
import { localFileTarget } from "./evidence-target";
import { handleFarmingRequest } from "../farming/farming-http";
import { handleEmployeeApi } from "../employees/employee-api-http";
import { harvestValues, harvestCorrection, harvestDetail } from "@/features/cultivation-api/records-contracts";
import { cultivationLog, logValues, logCorrection } from "@/features/cultivation-api/logs-contracts";
export { localFileTarget } from "./evidence-target";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: responseHeaders });
const uploadQuery = z.strictObject({ action: z.enum(["invoice-photos", "recognize", "record-photo", "harvest-record", "harvest-correct", "log-record", "log-correct"]), id: z.guid().optional(), zoneId: z.guid().optional() });

function browserFiles(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.lot) return { ...record, lot: browserFiles(record.lot) };
  if (record.measurement) return { ...record, measurement: browserFiles(record.measurement) };
  if (typeof record.id !== "string") return value;
  if (Array.isArray(record.photos) && typeof record.zoneId === "string") return { ...record, photos: record.photos.map((photo, index) => ({ ...(photo as object), url: `/api/operations/harvest?action=photo&id=${record.id}&zoneId=${record.zoneId}&index=${index}` })) };
  if (Array.isArray(record.invoicePhotoUrls)) return { ...record, invoicePhotoUrls: record.invoicePhotoUrls.map((_, index) => `/api/operations/purchase-receipts?action=invoice&id=${record.id}&index=${index}`) };
  if ("photoUrl" in record) return { ...record, photoUrl: record.photoUrl ? `/api/operations/water?action=photo&id=${record.id}` : null };
  return value;
}
export async function handleOperationRequest(request: Request, areaName: string): Promise<Response> {
  if (areaName === "employees") return handleEmployeeApi(request);
  if (areaName === "zone-licenses" || areaName === "raft-details") return handleFarmingRequest(request, areaName);
  const area = z.enum(operationAreas).safeParse(areaName);
  if (!area.success) return json({ status: "not-found" }, 404);
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const backend = parseServerBackendConfig(process.env);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    const query = new URL(request.url).searchParams;
    let plan: OperationPlan | undefined;
    let upload: z.infer<typeof uploadQuery> | undefined;
    if (request.method === "POST") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
        const headers = guard.guard.checkHeaders(request, "POST");
        if (headers.status !== "allowed") return json({ status: "rejected" }, headers.status === "rejected" ? headers.httpStatus : 503);
        const checked = uploadQuery.safeParse(Object.fromEntries(query));
        if (!checked.success || [...query.keys()].length !== new Set(query.keys()).size) return json({ status: "invalid-input" }, 400);
        upload = checked.data;
        if (area.data === "cultivation-cycles" && ["log-record", "log-correct"].includes(upload.action) && upload.id && upload.zoneId) {
          const zone = upload.zoneId;
          plan = { area: area.data, action: upload.action, zoneId: zone, path: upload.action === "log-record" ? `/api/cultivation-cycles/${upload.id}/cultivation-logs` : `/api/cultivation-logs/${upload.id}`, method: upload.action === "log-record" ? "POST" : "PUT", permission: upload.action === "log-record" ? "LogsCreate" : "LogsEdit", schema: z.object({ log: cultivationLog }).transform(({ log }) => ({ log: { ...log, photos: log.photos.map((photo,index) => ({ ...photo, url: `/api/operations/cultivation-cycles?action=log-photo&id=${log.id}&zoneId=${zone}&index=${index}` })) } })) };
        }
        if (area.data === "harvest" && upload.action === "harvest-record" && upload.id && upload.zoneId) {
          plan = { area: "harvest", action: upload.action, zoneId: upload.zoneId, path: `/api/rafts/${upload.id}/harvest-lots`, method: "POST", permission: "Create", schema: z.object({ lot: z.object({ id: z.guid(), lotCode: z.string() }) }) };
        }
        if (area.data === "harvest" && upload.action === "harvest-correct" && upload.id && upload.zoneId) {
          plan = { area: "harvest", action: upload.action, zoneId: upload.zoneId, path: `/api/harvest-lots/${upload.id}`, method: "PUT", permission: "Edit", schema: z.object({ lot: harvestDetail }) };
        }
        if (area.data === "purchase-receipts" && upload.action === "invoice-photos" && upload.id) {
          plan = { area: area.data, action: upload.action, path: `/api/purchase-receipts/${upload.id}/invoice-photos`, method: "POST", permission: "Edit", schema: c.receiptSchema };
        } else if (area.data === "water" && ["recognize", "record-photo"].includes(upload.action) && upload.zoneId) {
          plan = { area: area.data, action: upload.action, zoneId: upload.zoneId, path: `/api/zones/${upload.zoneId}/water-measurements/${upload.action === "recognize" ? "recognize" : "with-photo"}`,
            method: "POST", permission: "Create", schema: upload.action === "recognize" ? c.recognitionSchema : c.waterSchema };
        }
      } else {
        const checked = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
        if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
        plan = planOperation(area.data, request.method, query, checked.body.readForValidation());
      }
    } else plan = planOperation(area.data, request.method, query);
    if (!plan) return json({ status: "invalid-input" }, 400);
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application") return json({ status: "onboarding-required" }, 403);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    if (!operationAllowed(area.data, context.context.identity, context.context.permissions.functionPermissions, plan.permission, plan.zoneId)
      || plan.file === "export" && !operationAllowed(area.data, context.context.identity, context.context.permissions.functionPermissions, "View", plan.zoneId)) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (request.signal.aborted) return json({ status: "unavailable" }, 503);
    let payload: string | FormData | undefined = plan.body === undefined ? undefined : JSON.stringify(plan.body);
    if (plan.multipartFields) {
      payload = new FormData();
      for (const [key, value] of Object.entries(plan.body as Record<string, unknown>)) {
        if (value == null) continue;
        for (const item of Array.isArray(value) ? value : [value]) payload.append(key, String(item));
      }
    }
    if (upload) {
      const logUpload = upload.action === "log-record" || upload.action === "log-correct";
      const input = await readOperationUpload(request, area.data === "water", area.data === "harvest" || logUpload ? { optionalFile: upload.action !== "log-record", maxFiles: 10 } : {});
      if (!input) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const validator = upload.action === "recognize" ? z.strictObject({ clientOperationId: z.uuid() })
        : upload.action === "record-photo" ? c.recordWaterSchema : upload.action === "harvest-record" ? harvestValues : upload.action === "harvest-correct" ? harvestCorrection : upload.action === "log-record" ? logValues : upload.action === "log-correct" ? logCorrection : z.strictObject({});
      const values = validator.safeParse(input.payload);
      if (!values.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      if ((area.data === "harvest" || logUpload) && input.files.some(file => !["image/jpeg", "image/png"].includes(file.type))) return json({ status: "invalid-input", code: "MSG01" }, 400);
      if (upload.action === "log-correct") {
        const correction = logCorrection.safeParse(input.payload);
        const total = correction.success ? input.files.length + correction.data.keepPhotoKeys.length : 0;
        if (!correction.success || total < 1 || total > 10) return json({ status: "invalid-input", code: "MSG01" }, 400);
      }
      if (upload.action === "harvest-correct") {
        const correction = harvestCorrection.safeParse(input.payload);
        if (!correction.success || input.files.length + correction.data.keepPhotoKeys.length > 10) return json({ status: "invalid-input", code: "MSG01" }, 400);
      }
      payload = new FormData();
      for (const file of input.files) payload.append(area.data === "water" ? "photo" : area.data === "harvest" || logUpload ? "photos" : "files", file, file.name);
      for (const [key, value] of Object.entries(values.data)) if (value != null) {
        for (const part of Array.isArray(value) ? value : [value]) payload.append(key, String(part));
      }
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const budget = upload || plan.action === "recognize-again" ? Math.max(20_000, backend.config.timeoutMs)
      : plan.file ? Math.max(15_000, backend.config.timeoutMs) : backend.config.timeoutMs;
    const timeout = setTimeout(abort, budget);
    try {
      const upstream = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, cache: "no-store", redirect: "error", credentials: "omit", signal: controller.signal,
        headers: { Accept: plan.file === "export" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/json",
          Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(typeof payload === "string" ? { "Content-Type": "application/json" } : {}) }, body: payload });
      let data: unknown;
      let bytes: Uint8Array | undefined;
      let contentType = upstream.headers.get("content-type")?.split(";")[0];
      if (plan.file === "export" && upstream.ok) {
        if (contentType !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return json({ status: "invalid-response" }, 502);
        bytes = await readBoundedBytes(upstream.body, controller.signal, 32 * 1024 * 1024, budget);
      } else if (plan.noContent && upstream.status === 204) data = { done: true };
      else if (plan.action === "stop-editing" && upstream.status === 204) data = { stopped: true };
      else {
        const result = await readBackendResponse(upstream, "profileRead");
        if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
        if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
        const parsed = plan.schema.safeParse(result.data);
        if (!parsed.success) return json({ status: "invalid-response" }, 502);
        if (plan.expectedId && (parsed.data as { id?: string }).id !== plan.expectedId) return json({ status: "invalid-response" }, 502);
        if (area.data === "workforce") {
          const records = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
          if (records.some((row: { zoneId?: string }) => row.zoneId && !operationAllowed("workforce", context.context.identity, context.context.permissions.functionPermissions, plan.permission, row.zoneId))) return json({ status: "invalid-response" }, 502);
        }
        data = parsed.data;
      }
      if (plan.file === "invoice" || plan.file === "photo") {
        const record = data as Record<string, unknown>;
        const raw = plan.file === "invoice" ? (record.invoicePhotoUrls as string[])[plan.index ?? 0] : area.data === "harvest" || plan.action === "log-photo" ? (record.photos as { url: string }[])[plan.index ?? 0]?.url : record.photoUrl;
        const target = localFileTarget(raw, backend.config.origin);
        if (!target) return json({ status: "not-found" }, 404);
        const file = await fetch(target, { cache: "no-store", redirect: "error", credentials: "omit", signal: controller.signal });
        contentType = file.headers.get("content-type")?.split(";")[0];
        if (!file.ok || !["image/jpeg", "image/png", "application/pdf"].includes(contentType ?? "")) return json({ status: "unavailable" }, 503);
        bytes = await readBoundedBytes(file.body, controller.signal, 11 * 1024 * 1024, budget);
      }
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      if (request.signal.aborted || controller.signal.aborted) return json({ status: "unavailable" }, 503);
      if (bytes) {
        const extension = plan.file === "export" ? "xlsx" : contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : "jpg";
        return new Response(bytes as BodyInit, { headers: { ...responseHeaders, "Content-Type": contentType!, "Content-Disposition": `${plan.file === "photo" ? "inline" : "attachment"}; filename="${area.data}.${extension}"`,
          "Content-Security-Policy": "sandbox; default-src 'none'" } });
      }
      return json({ status: "success", data: browserFiles(data) });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
