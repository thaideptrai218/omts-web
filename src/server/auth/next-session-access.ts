import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionGateway } from "./session-gateway.instance";
import { sessionDestination, type SessionPhase } from "./session-destinations";

// React cache deduplicates within one RSC request; no cross-request user cache.
export const readRequestSession = cache(async () => {
  const header = (await headers()).get("cookie");
  return getSessionGateway().resolve(header);
});

export const readRequestApplication = cache(async () => {
  const header = (await headers()).get("cookie");
  return getSessionGateway().application(header);
});

// The account phase comes from the API, once per request, and is stored nowhere.
export const readRequestPhase = cache(async () => {
  const header = (await headers()).get("cookie");
  return getSessionGateway().phase(header);
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
  const result = await readRequestPhase();
  if (result.status === "unauthenticated") redirect(result.clearCookie ? "/session/recover" : "/login");
  if (result.status === "ready" && result.phase !== expected) redirect(sessionDestination(result.phase));
  return result.status === "ready" ? { status: "ready" as const } : { status: "unavailable" as const };
}
