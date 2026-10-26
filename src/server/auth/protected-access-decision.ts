import "server-only";

import type { ApplicationSessionGuardResult } from "./application-session-guard";
import type { ResolvedServerSession } from "./server-session-resolver";

export type ProtectedAccessDecision =
  | Readonly<{ action: "render"; session: ResolvedServerSession }>
  | Readonly<{ action: "redirect-login" }>
  | Readonly<{ action: "recover-invalid-session" }>
  | Readonly<{
      action: "onboarding";
      phase: "password-change-required" | "contact-verification-required";
    }>
  | Readonly<{ action: "service-unavailable" }>;

/**
 * Converts server authentication state into a navigation-neutral decision.
 * URL selection and cookie mutation stay in the Next.js adapter layer.
 */
export function decideProtectedAccess(
  result: ApplicationSessionGuardResult,
): ProtectedAccessDecision {
  if (result.status === "granted") {
    return Object.freeze({ action: "render", session: result.session });
  }
  if (result.status === "onboarding-required") {
    return Object.freeze({ action: "onboarding", phase: result.phase });
  }
  if (result.status === "unavailable") {
    return Object.freeze({ action: "service-unavailable" });
  }
  return Object.freeze({
    action: result.clearCookie
      ? "recover-invalid-session"
      : "redirect-login",
  });
}
