import "server-only";

import type { ResolvedServerSession, ServerSessionResolution } from "./server-session-resolver";

export type ApplicationSessionGuardResult =
  | Readonly<{ status: "granted"; session: ResolvedServerSession }>
  | Readonly<{ status: "unauthenticated"; clearCookie: boolean }>
  | Readonly<{ status: "unavailable" }>;

const anonymous: ApplicationSessionGuardResult = Object.freeze({ status: "unauthenticated", clearCookie: false });
const invalidSession: ApplicationSessionGuardResult = Object.freeze({ status: "unauthenticated", clearCookie: true });
const unavailable: ApplicationSessionGuardResult = Object.freeze({ status: "unavailable" });

/**
 * Narrows a resolution to a usable access token. This is an authentication gate only:
 * the account-state phase (password change, phone verification) is enforced by the API on
 * every call and read from the API where a page needs it, never from the cookie.
 */
export function guardApplicationSession(resolution: ServerSessionResolution): ApplicationSessionGuardResult {
  if (resolution.status === "anonymous") return anonymous;
  if (resolution.status === "invalid-session") return invalidSession;
  if (resolution.status === "unavailable") return unavailable;
  return Object.freeze({ status: "granted", session: resolution.session });
}
