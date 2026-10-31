import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { newSession } from "./__tests__/session-fixture";
import type { ApplicationSessionGuardResult } from "./application-session-guard";
import { decideProtectedAccess } from "./protected-access-decision";
import { ResolvedServerSession } from "./server-session-resolver";

function granted(): ApplicationSessionGuardResult {
  return {
    status: "granted",
    session: new ResolvedServerSession(
      {
        ...newSession({ phase: "application" }),
        schemaVersion: 1,
        createdAtMs: 1,
        revision: "revision-1",
      },
      "fixture-access-token",
    ),
  };
}

describe("protected access decision", () => {
  it("renders only with the exact resolved application session", () => {
    const input = granted();
    const result = decideProtectedAccess(input);
    expect(result.action).toBe("render");
    if (result.action !== "render" || input.status !== "granted") {
      throw new Error("Expected render decision");
    }
    expect(result.session).toBe(input.session);
    expect(() => JSON.stringify(result)).toThrow(
      "RESOLVED_SERVER_SESSION_NOT_SERIALIZABLE",
    );
  });

  it.each([
    [false, "redirect-login"],
    [true, "recover-invalid-session"],
  ] as const)("maps unauthenticated clearCookie=%s to %s", (clearCookie, action) => {
    expect(decideProtectedAccess({
      status: "unauthenticated",
      clearCookie,
    })).toEqual({ action });
  });

  it.each([
    "password-change-required",
    "contact-verification-required",
  ] as const)("preserves onboarding phase %s without a server capability", (phase) => {
    const result = decideProtectedAccess({
      status: "onboarding-required",
      phase,
    });
    expect(result).toEqual({ action: "onboarding", phase });
    expect(result).not.toHaveProperty("session");
  });

  it("keeps infrastructure failure away from login/logout actions", () => {
    expect(decideProtectedAccess({ status: "unavailable" })).toEqual({
      action: "service-unavailable",
    });
  });
});
