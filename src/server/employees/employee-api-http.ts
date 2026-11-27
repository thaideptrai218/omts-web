import "server-only";
import { employeeFileMime } from "@/features/employee-api/employee-file-contract";
import { canReadEmployees } from "@/features/employee-api/employee-read-access";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "./employee-session";
import { localFileTarget } from "../operations/evidence-target";
import { readBoundedBytes } from "../operations/bounded-body";
import { rewriteEmployeePhotos } from "./employee-photo-url";
import { readHrProblem } from "../backend/hr-problem-copy";
import { planEmployeeApi, planEmployeeImport, planEmployeePhoto, type Plan } from "./employee-api-plan";
import { employeeFileName, isEmployeeUpload, readEmployeeImportUpload, readEmployeePhotoUpload, readEmployeeWorkbook } from "./employee-file-http";

const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
export async function handleEmployeeApi(request: Request): Promise<Response> {
  const gateway = getSessionGateway(), config = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (config.status !== "valid" || config.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let input: unknown, upload: FormData | undefined, uploadPlan: Plan | undefined;
    const query = new URL(request.url).searchParams;
    if (request.method === "POST") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      if (isEmployeeUpload(request)) {
        // The query is checked before the body is consumed; the permission check below still runs before the backend is called.
        uploadPlan = query.get("action") === "photo" ? planEmployeePhoto(query) : planEmployeeImport(query);
        if (!uploadPlan) return json({ status: "invalid-input", code: "MSG01" }, 400);
        const read = uploadPlan.file === "photo" ? await readEmployeePhotoUpload(request, guard.guard) : await readEmployeeImportUpload(request, guard.guard);
        if (read.status === "rejected") return json({ status: "rejected" }, read.httpStatus);
        if (read.status === "invalid") return json({ status: "invalid-input", code: "MSG01" }, 400);
        upload = read.form;
      } else {
        const check = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
        if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
        input = check.body.readForValidation();
      }
    }
    const plan = upload ? uploadPlan : planEmployeeApi(request.method, query, input);
    if (!plan) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    // Chủ hợp tác xã làm mọi việc; Kế toán chỉ đọc danh sách, hồ sơ và loại công việc (backend vẫn ẩn dữ liệu cá nhân của họ).
    const readOnlyViewer = ["list", "detail", "job-types", "photo"].includes(plan.action) && request.method === "GET" && canReadEmployees(context.context.identity, context.context.permissions.functionPermissions);
    // The salary setup belongs to whoever holds the pay rules (the Accountant); the backend checks the same permission.
    const payRuleViewer = !!plan.payRule && context.context.identity.subjectType === "Staff" && context.context.permissions.functionPermissions.some(entry => entry.functionCode === "PAY_RULES" && entry.action === plan.payRule);
    if (context.context.identity.subjectType !== "CooperativeOwner" && !readOnlyViewer && !payRuleViewer) return json({ status: "forbidden", code: "MSG02" }, 403);
    const controller = new AbortController(), abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    // Files take longer than a JSON call: a workbook is built or parsed row by row.
    const budget = plan.file ? Math.max(20_000, config.config.timeoutMs) : config.config.timeoutMs;
    const timeout = setTimeout(abort, budget);
    try {
      if (request.signal.aborted) controller.abort();
      const response = await fetch(new URL(plan.path, config.config.origin), { method: plan.method, cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
        headers: { Accept: plan.file === "export" || plan.file === "template" ? employeeFileMime : "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(plan.body ? { "Content-Type": "application/json" } : {}) },
        body: upload ?? (plan.body ? JSON.stringify(plan.body) : undefined) });
      // The pay rules answer with the date and period of their message (MSG-LABOR-04), so a failed salary call has its body read once more.
      const failedCopy = response.ok || !plan.payRule ? undefined : response.clone();
      let bytes: Uint8Array | undefined;
      const download = (plan.file === "export" || plan.file === "template") && response.ok;
      if (download) {
        bytes = await readEmployeeWorkbook(response, controller.signal, budget);
        if (!bytes) return json({ status: "invalid-response" }, 502);
      }
      const result = download ? undefined : await readBackendResponse(response, plan.action === "create" ? "employeeCreate" : plan.action === "update" ? "employeeUpdate" : "profileRead");
      const current = await gateway.resolve(request.headers.get("cookie"));
      if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
      if (request.signal.aborted || controller.signal.aborted) return json({ status: "unavailable" }, 503);
      if (bytes) {
        const name = employeeFileName(response.headers.get("content-disposition"), plan.file === "template" ? "template" : "export");
        return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Type": employeeFileMime, "Content-Disposition": `attachment; filename="${name}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
      }
      if (!result) return json({ status: "unavailable" }, 503);
      if (result.status === "http-error") {
        const hrProblem = await readHrProblem(failedCopy);
        return json({ status: "rejected", code: result.code, ...(result.employeeProblem ? { employeeProblem: result.employeeProblem } : {}), ...(hrProblem ? { hrProblem } : {}) }, result.httpStatus);
      }
      if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "invalid-response" }, 502);
      const parsed = plan.schema.safeParse(result.data);
      if (!parsed.success) return json({ status: "invalid-response" }, 502);
      const data = parsed.data as Record<string, unknown>, employee = (data.employee ?? data) as Record<string, unknown>;
      if (plan.id && plan.action !== "end-preview" && employee[plan.idKey ?? "id"] !== plan.id) return json({ status: "invalid-response" }, 502);
      if (plan.file === "photo-view") {
        // The photo is read from the employee the caller may see; only a stored image of the backend is fetched, and the session is checked again before the bytes leave.
        const target = localFileTarget(employee.photoUrl, config.config.origin);
        if (!target) return json({ status: "not-found" }, 404);
        const file = await fetch(target, { cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal });
        const type = file.headers.get("content-type")?.split(";")[0];
        if (!file.ok || (type !== "image/jpeg" && type !== "image/png")) return json({ status: "unavailable" }, 503);
        const image = await readBoundedBytes(file.body, controller.signal, 3 * 1024 * 1024, budget);
        const after = await gateway.resolve(request.headers.get("cookie"));
        if (after.status !== "resolved" || !sameEmployeeSession(initial.session, after.session)) return json({ status: "session-expired" }, 401);
        return new Response(image as BodyInit, { headers: { ...headers, "Cache-Control": "private, max-age=300", "Content-Type": type, "Content-Disposition": `inline; filename="employee.${type === "image/png" ? "png" : "jpg"}"`, "Content-Security-Policy": "sandbox; default-src 'none'" } });
      }
      if ("employee" in data) { delete data.message; delete data.messageCode; }
      // Receipts (issue-account, create with account) keep the credential fields; everything else returns the bare employee.
      // A create or update answers with the bare employee; the duplicate ID number warning travels inside it so the screen can show it.
      const bare = data.duplicateIdNumber ? { ...employee, duplicateIdNumber: data.duplicateIdNumber } : employee;
      return json({ status: "success", data: rewriteEmployeePhotos("employee" in data && !plan.receipt && !["end-employment", "resume", "issue-account"].includes(plan.action) ? bare : data, config.config.origin) });
    } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); }
  } catch { return json({ status: "unavailable" }, 503); }
}
