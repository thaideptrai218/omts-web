import "server-only";

// Where the account stands, derived from the API on demand and never stored.
export type SessionPhase = "password-change-required" | "contact-verification-required" | "application";

export function sessionDestination(phase: SessionPhase): string {
  switch (phase) {
    case "password-change-required": return "/onboarding/password";
    case "contact-verification-required": return "/onboarding/contact";
    case "application": return "/dashboard";
  }
}
