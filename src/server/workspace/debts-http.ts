import "server-only";
import { z } from "zod";
import { debtList, debtStatement } from "@/features/debts-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { sameEmployeeSession } from "../employees/employee-session";
import { readBackendResponse } from "../backend/backend-response";
export async function handleDebtRead(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const query = new URL(request.url).searchParams, parsed = z.discriminatedUnion("action", [z.strictObject({ action: z.literal("list"), search: z.string().max(200).optional(), page: z.string().regex(/^[1-9]\d{0,5}$/) }), z.strictObject({ action: z.literal("statement"), supplierId: z.guid(), from: z.iso.date().optional(), to: z.iso.date().optional() })]).safeParse(Object.fromEntries(query));
  if (!parsed.success || query.size !== new Set(query.keys()).size) return json({ status: "invalid-input" }, 400);
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env); if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  try { const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401); if (initial.session.phase !== "application") return json({ status: "forbidden" }, 403);
    const application = await gateway.application(request.headers.get("cookie")); if (application.status !== "ready") return json({ status: "unavailable" }, 503);
    if (application.context.identity.subjectType !== "CooperativeOwner" && !application.context.permissions.functionPermissions.some(p => p.functionCode === "SUPPLIER_PAYMENTS" && p.action === "View")) return json({ status: "forbidden", code: "MSG02" }, 403);
    const q = parsed.data, values = new URLSearchParams(query); values.delete("action"); values.delete("supplierId"); if (q.action === "list") values.set("pageSize", "20");
    const path = q.action === "list" ? "/api/supplier-debts" : `/api/supplier-debts/${q.supplierId}/statement`;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(`${path}?${values}`, backend.config.origin), { headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", credentials: "omit", redirect: "error", signal });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie")); if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus); if (result.status !== "success" || signal.aborted) return json({ status: "unavailable" }, 503);
    const value = (q.action === "list" ? debtList : debtStatement).safeParse(result.data); if (!value.success || q.action === "statement" && "supplier" in value.data && value.data.supplier.id !== q.supplierId) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: value.data });
  } catch { return json({ status: "unavailable" }, 503); }
}
