import "server-only";
import type { ZodType } from "zod";
import { backendAccountWithPasswordSchema } from "@/features/account-access/account-credential-contract";
import { getSessionGateway } from "../auth/session-gateway.instance";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { readBackendResponse } from "../backend/backend-response";
import { sameEmployeeSession } from "../employees/employee-session";

type Plan<T> = Readonly<{
  /** Validates the browser body; the parsed value feeds `forward`. */
  bodySchema: ZodType<T>;
  /** Fixed backend path and JSON payload (undefined = bodyless POST) built only from validated input. */
  forward(input: T): { path: string; payload?: unknown };
  /** 201 for create, 200 for reset: any other success status is not the contract. */
  successStatus: 200 | 201;
}>;

/**
 * Shared Owner-only POST used by "create user" and "reset password": both return a backend StaffAccountWithPassword whose
 * temporary password is shown once. The session is re-resolved after the call so a committed result is never returned to a
 * different session, and only the allow-listed credential fields leave the BFF.
 */
export async function forwardOwnerCredentialPost<T>(request: Request, plan: Plan<T>) {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const gateway = getSessionGateway(), backend = parseServerBackendConfig(process.env);
  if (gateway.mode !== "api") return json({ status: "disabled" }, 404);
  if (backend.status !== "valid" || backend.config.source !== "api") return json({ status: "unavailable" }, 503);
  if (new URL(request.url).search) return json({ status: "invalid-input", code: "MSG01" }, 400);
  try {
    const initial = await gateway.resolve(request.headers.get("cookie"));
    if (initial.status !== "resolved") return json({ status: initial.status === "unavailable" ? "unavailable" : "session-expired" }, initial.status === "unavailable" ? 503 : 401);
    if (initial.session.identity.subjectType !== "CooperativeOwner") return json({ status: "forbidden", code: "MSG02" }, 403);
    const guard = createCsrfGuard(process.env);
    if (guard.status !== "available") return json({ status: "unavailable" }, 503);
    const checked = await guard.guard.check(request, { method: "POST", body: "json", maxBytes: 16_384, timeoutMs: 5000 });
    if (checked.status !== "allowed") return json({ status: "rejected" }, checked.status === "rejected" ? checked.httpStatus : 503);
    const parsed = plan.bodySchema.safeParse(checked.body.readForValidation());
    if (!parsed.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const { path, payload } = plan.forward(parsed.data);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(backend.config.timeoutMs)]);
    const response = await fetch(new URL(path, backend.config.origin), { method: "POST", credentials: "omit", redirect: "error", cache: "no-store", signal,
      headers: { Accept: "application/json", Authorization: `Bearer ${initial.session.readAccessTokenForBackend()}`, ...(payload === undefined ? {} : { "Content-Type": "application/json" }) },
      body: payload === undefined ? undefined : JSON.stringify(payload) });
    const result = await readBackendResponse(response, "profileRead"), current = await gateway.resolve(request.headers.get("cookie"));
    if (current.status !== "resolved" || !sameEmployeeSession(initial.session, current.session)) return json({ status: "session-expired" }, 401);
    if (result.status === "http-error") return json({ status: "rejected", code: result.code }, result.httpStatus);
    if (result.status !== "success" || result.httpStatus !== plan.successStatus) return json({ status: "unavailable" }, 503);
    const credential = backendAccountWithPasswordSchema.safeParse(result.data);
    if (!credential.success) return json({ status: "invalid-response" }, 502);
    if (signal.aborted) return json({ status: "unavailable" }, 503);
    const { account, temporaryPassword, temporaryPasswordExpiresAt, fixedPassword } = credential.data;
    // A thời vụ account has the cooperative's default password: only the fact travels, never the password.
    if (fixedPassword === true) return json({ status: "success", data: { account: { id: account.id, username: account.username, displayName: account.displayName }, fixedPassword: true } });
    if (!temporaryPasswordExpiresAt) return json({ status: "invalid-response" }, 502);
    return json({ status: "success", data: { account: { id: account.id, username: account.username, displayName: account.displayName }, temporaryPassword, temporaryPasswordExpiresAt } });
  } catch { return json({ status: "unavailable" }, 503); }
}
