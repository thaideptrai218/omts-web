import "server-only";
import { z } from "zod";
import { banksSchema, receivingAccountSchema, saveReceivingAccountSchema } from "@/features/bank-api/contracts";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";
export async function handleReceivingAccount(request: Request) {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  const gateway = getSessionGateway(), config = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (config.status !== "valid" || config.config.source !== "api") return json({ status: "unavailable" }, 503);
  const query = new URL(request.url).searchParams;
  const banks = query.size === 1 && query.get("banks") === "1";
  if (query.size && !banks || !["GET", "POST"].includes(request.method) || banks && request.method !== "GET") return json({ status: "invalid-input" }, 400);
  try {
    let body;
    if (request.method === "POST") {
      const guard = createCsrfGuard(process.env);
      if (guard.status !== "available") return json({ status: "unavailable" }, 503);
      const checked = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 4096, timeoutMs: 5000 });
      if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
      const parsed = saveReceivingAccountSchema.safeParse(checked.body.readForValidation());
      if (!parsed.success) return json({ status: "invalid-input" }, 400);
      body = parsed.data;
    }
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.phase !== "application" || initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden" }, 403);
    const response = await fetch(new URL(banks ? "/api/banks" : "/api/cooperative/receiving-bank-account", config.config.origin), { method: body ? "PUT" : "GET", headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(config.config.timeoutMs)]) });
    const result = await readBackendResponse(response, "profileRead");
    const current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success") return json({ status: "invalid-response" }, 502);
    const schema = banks ? banksSchema : body ? z.object({ receivingBankAccount: receivingAccountSchema }).transform(v => v.receivingBankAccount) : receivingAccountSchema;
    const parsed = schema.safeParse(result.data);
    return parsed.success ? json({ status: "success", data: parsed.data }) : json({ status: "invalid-response" }, 502);
  } catch { return json({ status: "unavailable" }, 503); }
}
