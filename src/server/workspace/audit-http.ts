import "server-only";
import { z } from "zod";
import { auditPage, auditDetail } from "@/features/audit-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleAudit(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env); if (gateway.mode !== "api" || backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  const query = new URL(request.url).searchParams;
  const filter = z.strictObject({ id: z.guid().optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), action: z.string().max(100).optional(), recordType: z.string().max(100).optional(), recordCode: z.string().max(100).optional(), page: z.string().regex(/^[1-9]\d{0,5}$/).optional(), pageSize: z.literal("20").optional() }).safeParse(Object.fromEntries([...query].filter(([,value]) => value !== "")));
  if (!filter.success || new Set(query.keys()).size !== query.size || filter.data.id && query.size !== 1) return json({ status: "invalid-input" }, 400);
  for (const [key,value] of [...query]) if (!value) query.delete(key);
  try { const initial = await gateway.resolve(request.headers.get("cookie")); if (initial.status !== "resolved") return json({ status: "session-expired" }, 401); if (initial.session.phase !== "application" || initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]); const id = query.get("id"); const path = id ? `/api/audit-events/${id}` : `/api/audit-events?${query}`;
    const response = await fetch(new URL(path, backend.config.origin), { headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}` }, cache: "no-store", credentials: "omit", redirect: "error", signal }); const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie")); if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus); if (result.status !== "success") return json({ status: "unavailable" }, 503);
    const parsed = id ? auditDetail.safeParse(result.data) : auditPage.safeParse(result.data); return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
