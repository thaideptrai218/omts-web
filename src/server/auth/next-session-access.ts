import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionGateway } from "./session-gateway.instance";
import { sessionDestination } from "./session-destinations";
import type { SessionPhase } from "./session-store";

// React cache deduplicates within one RSC request; no cross-request user cache.
export const readRequestSession = cache(async () => {
  const header = (await headers()).get("cookie");
  return getSessionGateway().resolve(header);
});

export const readRequestApplication = cache(async () => {
  const header = (await headers()).get("cookie");
  return getSessionGateway().application(header);
});

export async function requireApplicationPage() {
  const result = await readRequestApplication();
  if (result.status === "unauthenticated") {
    redirect(result.clearCookie ? "/session/recover" : "/login");
  }
  if (result.status === "onboarding-required") redirect(sessionDestination(result.phase));
  return result;
}

export async function requireOnboardingPage(expected: Exclude<SessionPhase, "application">) {
  const result = await readRequestSession();
  if (result.status === "anonymous") redirect("/login");
  if (result.status === "invalid-session") redirect("/session/recover");
  if (result.status === "resolved" && result.session.phase !== expected) {
    redirect(sessionDestination(result.session.phase));
  }
  // Do not pass the server capability to an onboarding Client Component.
  return result.status === "resolved" ? { status: "ready" as const } : { status: "unavailable" as const };
}
