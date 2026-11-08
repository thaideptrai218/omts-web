import "server-only";

import type { SessionPhase } from "./session-store";

export function sessionDestination(phase: SessionPhase): string {
  switch (phase) {
    case "password-change-required": return "/onboarding/password";
    case "contact-verification-required": return "/onboarding/contact";
    case "application": return "/dashboard";
  }
}
