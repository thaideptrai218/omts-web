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
import { lotTracingUpload, lotTracingUploadActions } from "./lot-tracing-upload-plan";
import { claimUpload, claimUploadActions } from "./claim-upload-plan";
import { handleFarmingRequest } from "../farming/farming-http";
import { handleEmployeeApi } from "../employees/employee-api-http";
import { readFarmingProblem } from "../backend/farming-problem-copy";
import { farmingRecordUpload, farmingRecordUploadActions, farmingRecordPayload, appendFarmingFields } from "./farming-record-upload";
export { localFileTarget } from "./evidence-target";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: responseHeaders });
const farmingAreas = new Set<string>(["harvest", "seeding", "material-usages", "cultivation-cycles"]);
const uploadQuery = z.strictObject({ action: z.enum(["invoice-photos", "recognize", ...farmingRecordUploadActions, ...lotTracingUploadActions, ...claimUploadActions]), id: z.guid().optional(), zoneId: z.guid().optional() });

function browserFiles(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.claim) return { ...record, claim: browserFiles(record.claim) };
  if (record.lot) return { ...record, lot: browserFiles(record.lot) };
  // Khiếu nại chất lượng: ảnh chỉ được xem qua BFF (action=photo), không đưa địa chỉ ký của backend xuống trình duyệt.
  if (Array.isArray(record.photos) && typeof record.code === "string" && (record.invoice || record.invoiceDate) && typeof record.zoneId !== "string") return { ...record, photos: record.photos.map((photo) => ({ ...(photo as object), url: "" })) };
  if (record.measurement) return { ...record, measurement: browserFiles(record.measurement) };
  if (typeof record.id !== "string") return value;
  if (Array.isArray(record.photos) && typeof record.zoneId === "string") return { ...record, photos: record.photos.map((photo, index) => ({ ...(photo as object), url: `/api/operations/harvest?action=photo&id=${record.id}&zoneId=${record.zoneId}&index=${index}` })) };
  if (Array.isArray(record.invoicePhotoUrls)) return { ...record, invoicePhotoUrls: record.invoicePhotoUrls.map((_, index) => `/api/operations/purchase-receipts?action=invoice&id=${record.id}&index=${index}`) };
  if ("photoUrl" in record) return { ...record, photoUrl: record.photoUrl ? `/api/operations/water?action=photo&id=${record.id}` : null };
  return value;
}
/** Tên tệp tải về dễ nhận biết: theo màn và ngày (xuất danh sách), hoặc theo hóa đơn khi in một hóa đơn. Chỉ gồm ký tự an toàn. */
function exportFileName(area: string, query: URLSearchParams, exporting: boolean): string {
  const id = query.get("id");
  if (exporting && area === "sales-invoice-list" && id && /^[0-9a-f-]{36}$/i.test(id)) return `hoa-don-${id.slice(0, 8)}`;
  return `${area}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
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
        plan = farmingRecordUpload(area.data, upload.action, upload.id, upload.zoneId)?.plan;
        if (area.data === "lot-tracing" && upload.id) plan = lotTracingUpload(upload.action, upload.id)?.plan;
        if (area.data === "claim-reports" && upload.id) plan = claimUpload(upload.action, upload.id)?.plan;
        if (area.data === "purchase-receipts" && upload.action === "invoice-photos" && upload.id) {
          plan = { area: area.data, action: upload.action, path: `/api/purchase-receipts/${upload.id}/invoice-photos`, method: "POST", permission: "Edit", schema: c.receiptSchema };
        } else if (area.data === "water" && upload.action === "recognize" && upload.zoneId) {
          plan = { area: area.data, action: upload.action, zoneId: upload.zoneId, path: `/api/zones/${upload.zoneId}/water-measurements/recognize`,
            method: "POST", permission: "Create", schema: c.recognitionSchema };
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
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    if (!operationAllowed(area.data, context.context.identity, context.context.permissions.functionPermissions, plan.permission, plan.zoneId)
      || plan.file === "export" && !operationAllowed(area.data, context.context.identity, context.context.permissions.functionPermissions, "View", plan.zoneId)) return json({ status: "forbidden", code: "MSG02" }, 403);
    if (request.signal.aborted) return json({ status: "unavailable" }, 503);
    let payload: string | FormData | undefined = plan.body === undefined ? undefined : JSON.stringify(plan.body);
    if (plan.multipartFields) {
      payload = new FormData();
      appendFarmingFields(payload, plan.body as Record<string, unknown>);
    }

    if (upload && area.data === "claim-reports") {
      // Trader gửi khiếu nại chất lượng kèm ảnh: multipart POST; 1-10 ảnh JPEG/PNG, trường tệp và phần JSON do kế hoạch tải lên quy định.
      const target = upload.id ? claimUpload(upload.action, upload.id) : undefined;
      const input = target && await readOperationUpload(request, false, { maxFiles: 10 });
      if (!target || !input || input.files.length < 1 || input.files.some((file) => !["image/jpeg", "image/png"].includes(file.type))) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const values = target.validator.safeParse(input.payload);
      if (!values.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      payload = new FormData();
      for (const file of input.files) payload.append(target.fileField, file, file.name);
      for (const [key, value] of Object.entries(values.data as Record<string, unknown>)) if (value != null) payload.append(key, String(value));
    } else
    if (upload && area.data === "lot-tracing") {
      // Sửa dữ liệu truy xuất (TRACE-03): PUT multipart; ảnh giữ lại + ảnh mới phải nằm trong giới hạn của từng loại bản ghi.
      const target = upload.id ? lotTracingUpload(upload.action, upload.id) : undefined;
      const input = target && await readOperationUpload(request, false, { optionalFile: target.minPhotos === 0, maxFiles: 10 });
      if (!target || !input || input.files.some((file) => !["image/jpeg", "image/png"].includes(file.type))) return json({ status: "invalid-input", code: "MSG01" }, 400);
      const values = target.validator.safeParse(input.payload);
      const kept = values.success && Array.isArray((values.data as { keepPhotoKeys?: unknown }).keepPhotoKeys) ? (values.data as { keepPhotoKeys: unknown[] }).keepPhotoKeys.length : 0, total = input.files.length + kept;
      if (!values.success || total < target.minPhotos || total > target.maxPhotos) return json({ status: "invalid-input", code: "MSG01" }, 400);
      payload = new FormData();
      for (const file of input.files) payload.append(target.fileField, file, file.name);
      for (const [key, value] of Object.entries(values.data as Record<string, unknown>)) if (value != null) {
        for (const part of Array.isArray(value) ? value : [value]) payload.append(key, String(part));
      }
    } else
    if (upload) {
      const farming = farmingRecordUpload(area.data, upload.action, upload.id, upload.zoneId);
      if (farming) {
        const result = await farmingRecordPayload(request, farming);
        if (!result.form) return json({ status: "invalid-input", code: "MSG-GEN-01", problem: { field: result.error, hint: result.hint } }, 400);
        payload = result.form;
      } else {
        const input = await readOperationUpload(request, area.data === "water");
        if (!input || !z.strictObject({}).safeParse(input.payload).success) return json({ status: "invalid-input", code: "MSG01" }, 400);
        payload = new FormData();
        for (const file of input.files) payload.append(area.data === "water" ? "photo" : "files", file, file.name);
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
      const failedCopy = upstream.ok ? undefined : upstream.clone();
      let bytes: Uint8Array | undefined;
      let contentType = upstream.headers.get("content-type")?.split(";")[0];
      if (plan.file === "export" && upstream.ok) {
        if (contentType !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return json({ status: "invalid-response" }, 502);
        bytes = await readBoundedBytes(upstream.body, controller.signal, 32 * 1024 * 1024, budget);
      } else if (plan.noContent && upstream.status === 204) data = { done: true };
      else {
        const result = await readBackendResponse(upstream, "profileRead", false, ["sales-invoices", "customer-payments", "sales-invoice-list"].includes(area.data));
        if (result.status === "http-error") {
          // Nuôi trồng questions and stock checks (MSG-GEN-04, MSG-CYCLE-01/07, MSG-INPUT-01) travel as an allow-listed problem.
          const problem = farmingAreas.has(area.data) ? await readFarmingProblem(failedCopy) : undefined;
          return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}), ...(result.invoiceConfirmation ? { invoiceConfirmation: result.invoiceConfirmation } : {}) }, result.httpStatus);
        }
        if (result.status !== "success" || ![200, 201, 202].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
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
        const raw = plan.file === "invoice" ? (record.invoicePhotoUrls as string[])[plan.index ?? 0] : area.data === "harvest" || area.data === "claim-reports" || area.data === "quality-claims" || plan.action === "log-photo" ? (record.photos as { url: string }[])[plan.index ?? 0]?.url : record.photoUrl;
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
        // Payroll exports keep the file name the backend chose (period in the name), limited to safe characters.
        const backendName = area.data === "payroll" && plan.file === "export" ? /filename="?([A-Za-z0-9._-]{1,80})\.xlsx"?/.exec(upstream.headers.get("content-disposition") ?? "")?.[1] : undefined;
        return new Response(bytes as BodyInit, { headers: { ...responseHeaders, "Content-Type": contentType!, "Content-Disposition": `${plan.file === "photo" ? "inline" : "attachment"}; filename="${backendName ?? exportFileName(area.data, query, plan.file === "export")}.${extension}"`,
          "Content-Security-Policy": "sandbox; default-src 'none'" } });
      }
      return json({ status: "success", data: browserFiles(data) });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
