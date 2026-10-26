"use client";

// Deliberately invalid imports for a negative build test, never a product route.
import { createServerSessionRuntimeOwner } from "../../../../src/server/auth/server-session-runtime-owner";
import { decideProtectedAccess } from "../../../../src/server/auth/protected-access-decision";
import { createLoginSessionService } from "../../../../src/server/auth/login-session-service";
import { createLoginHttpHandler } from "../../../../src/server/auth/login-http";
import { createPendingLoginDelivery } from "../../../../src/server/auth/pending-login-delivery";

export default function InvalidSessionAccessClientPage() {
  const owner = createServerSessionRuntimeOwner(async () => ({ status: "unavailable" }));
  const decision = decideProtectedAccess({ status: "unavailable" });
  return <p>{typeof owner.get}:{decision.action}:{typeof createLoginSessionService}:{typeof createLoginHttpHandler}:{typeof createPendingLoginDelivery}</p>;
}
