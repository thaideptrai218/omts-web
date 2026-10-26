import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { newSession } from "./__tests__/session-fixture";
import { guardApplicationSession } from "./application-session-guard";
import {
  ResolvedServerSession,
  type ServerSessionResolution,
} from "./server-session-resolver";
import type { SessionPhase, StoredSession } from "./session-store";

function resolved(phase: SessionPhase): ServerSessionResolution {
  const session: StoredSession = {
    ...newSession({ phase }),
    schemaVersion: 1,
    createdAtMs: 1,
    revision: "1",
  };

  return {
    status: "resolved",
    session: new ResolvedServerSession(session, "access-token-test"),
  };
}

describe("application session guard", () => {
  it("keeps a request without a cookie unauthenticated without asking to clear it", () => {
    expect(guardApplicationSession({ status: "anonymous" })).toEqual({
      status: "unauthenticated",
      clearCookie: false,
    });
  });

  it.each([
    "invalid-cookie",
    "missing-session",
    "expired",
    "revoked",
    "invalid-session",
  ] as const)("asks the HTTP layer to clear a stale cookie for %s", (reason) => {
    expect(
      guardApplicationSession({
        status: "invalid-session",
        reason,
        clearCookie: true,
      }),
    ).toEqual({ status: "unauthenticated", clearCookie: true });
  });

  it("does not misreport session infrastructure failure as logout", () => {
    expect(guardApplicationSession({ status: "unavailable" })).toEqual({
      status: "unavailable",
    });
  });

  it.each([
    "password-change-required",
    "contact-verification-required",
  ] as const)("blocks the application area while %s", (phase) => {
    expect(guardApplicationSession(resolved(phase))).toEqual({
      status: "onboarding-required",
      phase,
    });
  });

  it("grants the application phase without copying its server capability", () => {
    const resolution = resolved("application");
    const result = guardApplicationSession(resolution);

    expect(result.status).toBe("granted");
    if (result.status !== "granted" || resolution.status !== "resolved") {
      throw new Error("Expected an application session");
    }

    expect(result.session).toBe(resolution.session);
    expect(() => JSON.stringify(result)).toThrow(
      "RESOLVED_SERVER_SESSION_NOT_SERIALIZABLE",
    );
    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("refreshToken");
  });
});
