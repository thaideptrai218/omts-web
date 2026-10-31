import "server-only";

import { createCsrfGuard } from "./csrf-guard";
import { createSessionCookieHelpers } from "./session-cookies";
import { sessionDestination } from "./session-destinations";
import type { createSessionGateway } from "./session-gateway";

type Gateway = Pick<ReturnType<typeof createSessionGateway>, "mode" | "resolve" | "application">;

function json(value: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  });
  if (cookie !== undefined) headers.set("Set-Cookie", cookie);
  return Response.json(value, { status, headers });
}

export function createSessionHttpHandlers(
  environment: Readonly<Record<string, unknown>>,
  gateway: Gateway,
) {
  const csrf = createCsrfGuard(environment);
  const cookies = createSessionCookieHelpers(environment);

  return Object.freeze({
    async read(request: Request) {
      if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
      try {
        const result = await gateway.application(request.headers.get("cookie"));
        switch (result.status) {
          case "ready": return json({ status: "authenticated", ...result.context });
          case "unauthenticated": return json({ status: "anonymous", clearCookie: result.clearCookie }, 401);
          case "onboarding-required": return json({
            status: "onboarding-required", phase: result.phase,
            destination: sessionDestination(result.phase),
          }, 403);
          default: return json({ status: "unavailable" }, 503);
        }
      } catch {
        return json({ status: "unavailable" }, 503);
      }
    },
    async recover(request: Request) {
      if (gateway.mode === "mock") return json({ status: "disabled" }, 404);
      if (csrf.status !== "available" || cookies.status !== "available") {
        return json({ status: "unavailable" }, 503);
      }
      const check = await csrf.guard.check(request, { method: "POST", body: "none", timeoutMs: 5000 });
      if (check.status !== "allowed") {
        return json({ status: "rejected" }, check.status === "rejected" ? check.httpStatus : 503);
      }
      try {
        // Re-read the cookie supplied on this request. Never trust a SID in the URL/body.
        const result = await gateway.resolve(request.headers.get("cookie"));
        if (result.status === "unavailable") return json({ status: "unavailable" }, 503);
        if (result.status === "resolved") {
          return json({ status: "active", destination: sessionDestination(result.session.phase) });
        }
        if (result.status === "anonymous") return json({ status: "anonymous", destination: "/login" });
        return json(
          { status: "cleared", destination: "/login" },
          200,
          cookies.cookies.clear().readForResponseHeader(),
        );
      } catch {
        return json({ status: "unavailable" }, 503);
      }
    },
  });
}
