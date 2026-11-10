import "server-only";

import { sessionDestination } from "./session-destinations";
import type { createSessionGateway } from "./session-gateway";

type Gateway = Pick<ReturnType<typeof createSessionGateway>, "mode" | "application">;

function json(value: unknown, status = 200): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  });
  return Response.json(value, { status, headers });
}

export function createSessionHttpHandlers(gateway: Gateway) {
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
  });
}
