import "server-only";

import { parseServerBackendConfig } from "../config/backend-config";
import { parseServerWebSessionConfig } from "../config/web-session-config";
import { createBackendTransport } from "../backend/backend-transport";
import { guardApplicationSession } from "./application-session-guard";
import { loadApplicationContext } from "./application-context-dal";
import { createServerSessionResolver, type ServerSessionResolution } from "./server-session-resolver";
import { createSessionCookieHelpers } from "./session-cookies";
import type { SessionPhase } from "./session-destinations";
import { probeSessionPhase } from "./session-phase";

export type SessionPhaseResult =
  | Readonly<{ status: "ready"; phase: SessionPhase }>
  | Readonly<{ status: "unauthenticated"; clearCookie: boolean }>
  | Readonly<{ status: "unavailable" }>;

// Stateless: every answer comes from the request cookies and, where a page needs it, from the API.
// Nothing is cached across requests and no session record exists on the BFF.
export function createSessionGateway(
  environment: Readonly<Record<string, unknown>>,
  transport = createBackendTransport(environment),
  clock: () => number = Date.now,
) {
  const source = parseServerBackendConfig(environment);
  const web = parseServerWebSessionConfig(environment);
  const cookies = createSessionCookieHelpers(environment);
  const mode = source.status !== "valid" ? "unavailable" : source.config.source;
  const resolver = cookies.status === "available" ? createServerSessionResolver({ cookies: cookies.cookies, clock }) : undefined;

  async function resolve(cookieHeader: unknown): Promise<ServerSessionResolution> {
    if (mode !== "api" || web.status !== "valid" || !resolver) return { status: "unavailable" };
    return resolver.resolve(cookieHeader);
  }

  return Object.freeze({
    mode,
    resolve,
    application: async (cookieHeader: unknown) => loadApplicationContext(guardApplicationSession(await resolve(cookieHeader)), transport),
    // Where the account stands (application, password change, phone verification), asked of the API.
    async phase(cookieHeader: unknown): Promise<SessionPhaseResult> {
      const guarded = guardApplicationSession(await resolve(cookieHeader));
      if (guarded.status !== "granted") return guarded;
      const probe = await probeSessionPhase(transport, guarded.session.readAccessTokenForBackend());
      if (probe.state === "live") return { status: "ready", phase: probe.phase };
      return probe.state === "dead" ? { status: "unauthenticated", clearCookie: true } : { status: "unavailable" };
    },
  });
}
