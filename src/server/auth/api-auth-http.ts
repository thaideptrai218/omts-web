import "server-only";
import { z } from "zod";
import { createCsrfGuard } from "./csrf-guard";
import { getSessionGateway } from "./session-gateway.instance";
import { sessionDestination } from "./session-destinations";
import { currentPasswordChangeSchema } from "@/features/account-security/schemas/change-password-schema";

const login = z.strictObject({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
export async function handleApiAuth(request: Request, operation: "bootstrap" | "login" | "logout" | "recover" | "password") {
  const headers = new Headers({ "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff" });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const gateway = getSessionGateway();
  if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
  const guard = createCsrfGuard(process.env);
  if (guard.status !== "available") return json({ status: "unavailable" }, 503);
  try {
    const check = await guard.guard.check(request, operation === "login" || operation === "logout" || operation === "password"
      ? { method: "POST", body: "json", maxBytes: 8192, timeoutMs: 5000 }
      : { method: "POST", body: "none", timeoutMs: 5000 });
    if (check.status !== "allowed") return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
    const header = request.headers.get("cookie");
    if (operation === "recover") {
      const current = await gateway.resolve(header);
      if (current.status === "resolved") return json({ status: "active", destination: sessionDestination(current.session.phase) });
      if (current.status === "unavailable") return json({ status: "unavailable" }, 503);
    }
    const input = operation === "login" ? login.safeParse(check.body.readForValidation()) : undefined;
    if (input && !input.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const logout = operation === "logout" ? z.strictObject({ expectedRevision: z.uuid().optional() }).safeParse(check.body.readForValidation()) : undefined;
    if (logout && !logout.success) return json({ status: "invalid-input" }, 400);
    const reset = operation === "recover" ? await gateway.bootstrap(header) : undefined;
    const password = operation === "password" ? currentPasswordChangeSchema.safeParse(check.body.readForValidation()) : undefined;
    if (password && !password.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
    const result = operation === "password" ? await gateway.changePassword(header, password?.data, request.signal)
      : operation === "login" ? await gateway.login(header, input?.data, request.signal)
      : operation === "bootstrap" ? await gateway.bootstrap(header) : await gateway.logout(header, logout?.data?.expectedRevision ?? reset?.revision);
    if (result.status === "rejected") return json({ status: result.status, code: result.code }, result.httpStatus >= 400 && result.httpStatus < 500 ? result.httpStatus : 503);
    if (result.status === "unavailable") return json({ status: "unavailable" }, 503);
    if (result.status === "invalid-input") return json({ status: result.status, code: "MSG01" }, 400);
    if (result.status === "pending" || result.status === "reset-required") return json({ status: result.status, revision: result.revision }, 409);
    if (result.cookie) headers.append("Set-Cookie", result.cookie.readForResponseHeader());
    if (result.contextCookie) headers.append("Set-Cookie", result.contextCookie.readForResponseHeader());
    return json({ status: operation === "recover" && result.status === "signed-out" ? "cleared" : result.status, destination: result.destination, revision: result.revision });
  } catch { return json({ status: "unavailable" }, 503); }
}
