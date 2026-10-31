import "server-only";
import { z } from "zod";
import { apiTextSchema } from "@/features/auth/api/auth-contract.schemas";
import { messageCatalog } from "@/shared/messages/message-catalog";
import { createCsrfGuard } from "./csrf-guard";
import type { LoginOperationOptions, LoginSessionResult } from "./login-session-service";
import type { ServerSessionResolution } from "./server-session-resolver";
import { sessionDestination } from "./session-destinations";

const loginInput = z.strictObject({ identifier: apiTextSchema.max(254), password: z.string().min(1).max(128) });

export type LoginHttpGateway = Readonly<{
  mode: "mock" | "api" | "unavailable";
  resolve(cookieHeader: unknown): Promise<ServerSessionResolution>;
  login(input: unknown, options: LoginOperationOptions): Promise<LoginSessionResult>;
}>;

function json(value: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff",
  });
  if (cookie !== undefined) headers.set("Set-Cookie", cookie);
  return Response.json(value, { status, headers });
}

const unavailable = () => json({ status: "unavailable" }, 503);

// Not mounted in src/app. A write-capable gateway and browser/login-generation
// coordination must be reviewed before exposing this preparation as a live route.
export function createLoginHttpHandler(environment: Readonly<Record<string, unknown>>, gateway: LoginHttpGateway) {
  const csrf = createCsrfGuard(environment);
  return async function login(request: Request): Promise<Response> {
    if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
    if (gateway.mode !== "api" || csrf.status !== "available") return unavailable();
    let candidate: Extract<LoginSessionResult, { status: "created" }> | undefined;
    let delivered = false;
    try {
      const check = await csrf.guard.check(request, { method: "POST", body: "json", maxBytes: 65_536, timeoutMs: 5000 });
      if (check.status !== "allowed") {
        return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      }
      const input = loginInput.safeParse(check.body.readForValidation());
      if (!input.success) return json({ status: "invalid-input", code: "MSG01" }, 400);
      if (request.signal.aborted) return unavailable();

      const current = await gateway.resolve(request.headers.get("cookie"));
      if (request.signal.aborted || current.status === "unavailable") return unavailable();
      if (current.status === "resolved") {
        const destination = sessionDestination(current.session.phase);
        return destination ? json({ status: "active", destination }) : unavailable();
      }
      if (current.status === "invalid-session") {
        return json({ status: "session-recovery-required", destination: "/session/recover" }, 409);
      }

      const result = await gateway.login(input.data, { signal: request.signal });
      if (result.status === "created") candidate = result;
      if (request.signal.aborted) return unavailable();
      if (result.status === "invalid-input") return json({ status: "invalid-input", code: "MSG01" }, 400);
      if (result.status === "unavailable") return unavailable();
      if (result.status === "rejected") {
        if (!Number.isInteger(result.httpStatus) || result.httpStatus < 400 || result.httpStatus >= 500) return unavailable();
        const code = result.code && Object.hasOwn(messageCatalog, result.code) ? result.code : undefined;
        const retryAfterMs = Number.isSafeInteger(result.retryAfterMs) && result.retryAfterMs! >= 0
          ? result.retryAfterMs : undefined;
        return json({ status: "rejected", code, retryAfterMs }, result.httpStatus);
      }

      const destination = sessionDestination(result.phase);
      if (!destination) return unavailable();
      const header = result.cookie.readForResponseHeader();
      const response = json({ status: "created", phase: result.phase, destination }, 200, header);
      if (request.signal.aborted) return unavailable();
      delivered = true;
      return response;
    } catch {
      return unavailable();
    } finally {
      if (candidate && !delivered) {
        try { await candidate.abandon(); } catch { /* Cleanup is best effort, not proof of revocation. */ }
      }
    }
  };
}
