import "server-only";
import { z } from "zod";
import { vatRateDeactivated, vatRateList, vatRateRow } from "@/features/input-items/vat-rate";
import { problemExtras } from "@/features/input-items/contracts";

const refusal = problemExtras.extend({ detail: problemExtras.shape.message });
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

/**
 * The browser's door to the VAT rate catalogue of the backend (api/vat-rates): the list for everyone who reads items or receipts, and the Owner's writes
 * (create, edit, make default, deactivate with a replacement, activate). Each action names the backend call and the shape the answer must have.
 */
const id = z.guid(), rowVersion = z.string().min(1).max(200);
const name = z.string().trim().min(1).max(50);
/** A percent from 0 to 100 with at most two decimals. */
const percent = z.number().min(0).max(100).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6);
const rateBody = z.strictObject({ name, percent });

const readers = [["PURCHASE_RECEIPTS", "View"], ["SUPPLIER_PAYMENTS", "View"], ["CULTIVATION_CYCLES", "View"], ["INPUT_ISSUES", "View"]] as const;
const R = "/api/vat-rates";

const write = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), body: rateBody }),
  z.strictObject({ action: z.literal("update"), id, body: rateBody.extend({ rowVersion }) }),
  z.strictObject({ action: z.enum(["default", "activate"]), id }),
  z.strictObject({ action: z.literal("deactivate"), id, body: z.strictObject({ replacementId: id.optional(), rowVersion }) }),
]);
type Plan = { path: string; method: "GET" | "POST" | "PUT"; owner: boolean; schema: z.ZodType; body?: unknown; expectedId?: string };
function planWrite(p: z.infer<typeof write>): Plan {
  switch (p.action) {
    case "create": return { path: R, method: "POST", owner: true, schema: vatRateRow, body: p.body };
    case "update": return { path: `${R}/${p.id}`, method: "PUT", owner: true, schema: vatRateRow, body: p.body, expectedId: p.id };
    case "default": return { path: `${R}/${p.id}/default`, method: "POST", owner: true, schema: vatRateRow, expectedId: p.id };
    case "activate": return { path: `${R}/${p.id}/activate`, method: "POST", owner: true, schema: vatRateRow, expectedId: p.id };
    case "deactivate": return { path: `${R}/${p.id}/deactivate`, method: "POST", owner: true, schema: vatRateDeactivated, body: p.body };
  }
}

export async function handleVatRates(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try {
    let plan: Plan, outgoing: BodyInit | undefined;
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      const parsed = z.strictObject({ action: z.literal("list"), active: z.literal("true").optional() }).safeParse(Object.fromEntries(query));
      if (!parsed.success || new Set(query.keys()).size !== [...query.keys()].length) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = { path: parsed.data.active ? `${R}?active=true` : R, method: "GET", owner: false, schema: vatRateList };
    } else if (request.method === "POST") {
      const csrf = createCsrfGuard(process.env);
      if (csrf.status !== "available") return json({ status: "unavailable" }, 503);
      const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      const parsed = write.safeParse(check.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      plan = planWrite(parsed.data);
      if (plan.body !== undefined) outgoing = JSON.stringify(plan.body);
    } else return json({ status: "invalid-input" }, 405);

    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    const context = await gateway.application(request.headers.get("cookie"));
    if (context.status === "onboarding-required") return json({ status: "onboarding-required" }, 403);
    if (context.status !== "ready") return json({ status: "unavailable" }, 503);
    const { identity, permissions } = context.context;
    const allowed = identity.subjectType === "CooperativeOwner"
      || !plan.owner && identity.subjectType === "Staff" && readers.some(([fn, action]) => permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action));
    if (!allowed) return json({ status: "forbidden", code: "MSG02" }, 403);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(20_000, backend.config.timeoutMs))]);
    const response = await fetch(new URL(plan.path, backend.config.origin), { method: plan.method, body: outgoing, cache: "no-store", credentials: "omit", redirect: "error", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(outgoing ? { "Content-Type": "application/json" } : {}) } });
    const copy = response.ok ? undefined : response.clone();
    const result = await readBackendResponse(response, "profileRead", true);
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (!(current.status === "resolved" && sameEmployeeSession(initial.session, current.session))) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") {
      // The API writes its Vietnamese sentence for a refusal (system rate, default rate) in `detail`; the dialogs read it as `message`.
      const raw = copy ? refusal.safeParse(await copy.json().catch(() => undefined)).data : undefined;
      const problem = raw ? { ...raw, message: raw.message ?? raw.detail } : undefined;
      return json({ status: "rejected", code: result.code, ...(problem ? { problem } : {}) }, result.httpStatus);
    }
    if (result.status !== "success" || ![200, 201].includes(result.httpStatus)) return json({ status: "unavailable" }, 503);
    const value = plan.schema.safeParse(result.data);
    if (!value.success || plan.expectedId && (value.data as { id?: string }).id !== plan.expectedId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
