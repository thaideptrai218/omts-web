import "server-only";

import type {
  ResolvedServerSession,
  ServerSessionResolution,
} from "./server-session-resolver";
import type { SessionPhase } from "./session-store";

type LimitedSessionPhase = Exclude<SessionPhase, "application">;

export type ApplicationSessionGuardResult =
  | Readonly<{
      status: "granted";
      session: ResolvedServerSession;
    }>
  | Readonly<{
      status: "unauthenticated";
      clearCookie: boolean;
    }>
  | Readonly<{
      status: "onboarding-required";
      phase: LimitedSessionPhase;
    }>
  | Readonly<{ status: "unavailable" }>;

const anonymous: ApplicationSessionGuardResult = Object.freeze({
  status: "unauthenticated",
  clearCookie: false,
});

const invalidSession: ApplicationSessionGuardResult = Object.freeze({
  status: "unauthenticated",
  clearCookie: true,
});

const unavailable: ApplicationSessionGuardResult = Object.freeze({
  status: "unavailable",
});

/**
 * Narrows a resolved BFF session to the application phase.
 * This is an authentication-phase gate, not a permission authorization check.
 */
export function guardApplicationSession(
  resolution: ServerSessionResolution,
): ApplicationSessionGuardResult {
  if (resolution.status === "anonymous") return anonymous;
  if (resolution.status === "invalid-session") return invalidSession;
  if (resolution.status === "unavailable") return unavailable;

  if (resolution.session.phase !== "application") {
    return Object.freeze({
      status: "onboarding-required",
      phase: resolution.session.phase,
    });
  }

  return Object.freeze({
    status: "granted",
    session: resolution.session,
  });
}
