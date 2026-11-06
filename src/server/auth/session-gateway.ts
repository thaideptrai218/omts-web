import "server-only";

import { parseServerBackendConfig } from "../config/backend-config";
import { parseServerWebSessionConfig } from "../config/web-session-config";
import { readSessionCookie } from "./session-cookie-reader";
import { openServerSessionReadRuntime } from "./server-session-runtime";
import { createServerSessionRuntimeOwner } from "./server-session-runtime-owner";
import type { ServerSessionResolution } from "./server-session-resolver";
import { guardApplicationSession } from "./application-session-guard";
import { createBackendTransport } from "../backend/backend-transport";
import { loadApplicationContext } from "./application-context-dal";

// One gateway per worker; Redis provides shared session state across workers.
// Request results and DTOs are never retained by the owner.
export function createSessionGateway(
  environment: Readonly<Record<string, unknown>>,
  open = () => openServerSessionReadRuntime(environment),
  transport = createBackendTransport(environment),
) {
  const source = parseServerBackendConfig(environment);
  const web = parseServerWebSessionConfig(environment);
  const owner = createServerSessionRuntimeOwner(open);
  const mode = source.status !== "valid" ? "unavailable" : source.config.source;

  async function resolve(cookieHeader: unknown): Promise<ServerSessionResolution> {
    if (mode !== "api" || web.status !== "valid") return { status: "unavailable" };
    const cookie = readSessionCookie(cookieHeader, web.config.cookie.name);
    if (cookie.status === "missing") return { status: "anonymous" };
    if (cookie.status === "invalid-cookie") {
      return { status: "invalid-session", reason: "invalid-cookie", clearCookie: true };
    }
    const opened = await owner.get();
    return opened.status === "ready"
      ? opened.runtime.resolve(cookieHeader)
      : { status: "unavailable" };
  }

  return Object.freeze({
    mode,
    resolve,
    async application(cookieHeader: unknown) {
      const initial = guardApplicationSession(await resolve(cookieHeader));
      const result = await loadApplicationContext(initial, transport);
      if (result.status !== "ready" || initial.status !== "granted") return result;

      // Logout/expiry may occur while /me or /permissions is pending. Never
      // publish the old DTO until the same session revision has been rechecked.
      const current = guardApplicationSession(await resolve(cookieHeader));
      if (current.status === "unavailable") return { status: "session-unavailable" as const };
      if (current.status !== "granted") return current;
      if (current.session.revision !== initial.session.revision
        || current.session.identity.accountId !== initial.session.identity.accountId) {
        return { status: "session-unavailable" as const };
      }
      return result;
    },
    dispose: owner.dispose,
  });
}
