import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { accountId, staffPayload } from "@/features/access/api/__fixtures__/permissions";
import { newSession } from "./__tests__/session-fixture";
import type { BackendTransportResult } from "../backend/backend-result";
import { secretCanaries } from "../backend/__tests__/serialization-fixtures";
import { loadApplicationContext } from "./application-context-dal";
import type { ApplicationSessionGuardResult } from "./application-session-guard";
import { ResolvedServerSession } from "./server-session-resolver";

const accessToken = "fixture-access-token";
const backendSessionId = "322bb318-a72e-49aa-a8d7-a6169f889007";

function granted(subjectType: "Staff" | "CooperativeOwner" = "Staff"): ApplicationSessionGuardResult {
  const stored = {
    ...newSession({
      phase: "application",
      identity: { accountId, backendSessionId, subjectType },
    }),
    schemaVersion: 1 as const,
    createdAtMs: 1,
    revision: "revision-1",
  };
  return {
    status: "granted",
    session: new ResolvedServerSession(stored, accessToken),
  };
}

function identity(change: Record<string, unknown> = {}) {
  return {
    accountId,
    sessionId: backendSessionId,
    username: "fixture.user",
    subjectType: "Staff",
    ...change,
  };
}

function backend(results: readonly BackendTransportResult[]) {
  let index = 0;
  return {
    request: vi.fn(async () => results[index++] ?? { status: "unavailable" }),
  };
}

describe("application context DAL", () => {
  it.each([
    { status: "unauthenticated", clearCookie: false },
    { status: "unauthenticated", clearCookie: true },
    { status: "onboarding-required", phase: "password-change-required" },
    { status: "onboarding-required", phase: "contact-verification-required" },
  ] as const)("short-circuits session state %# before backend calls", async (sessionResult) => {
    const transport = backend([]);
    await expect(loadApplicationContext(sessionResult, transport)).resolves.toEqual(sessionResult);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("keeps session infrastructure failure distinct from authentication failure", async () => {
    const transport = backend([]);
    await expect(
      loadApplicationContext({ status: "unavailable" }, transport),
    ).resolves.toEqual({ status: "session-unavailable" });
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("loads identity then permissions with the same server-only access token", async () => {
    const transport = backend([
      { status: "success", httpStatus: 200, data: identity() },
      { status: "success", httpStatus: 200, data: staffPayload() },
    ]);
    const result = await loadApplicationContext(granted(), transport);

    expect(transport.request.mock.calls).toEqual([
      [{ endpoint: "identity", accessToken }],
      [{ endpoint: "permissions", accessToken }],
    ]);
    expect(result).toMatchObject({
      status: "ready",
      context: {
        identity: { accountId, username: "fixture.user", subjectType: "Staff" },
        permissions: {
          functionPermissions: [
            { functionCode: "WATER_MEASUREMENTS", action: "View" },
          ],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain(accessToken);
    expect(JSON.stringify(result)).not.toContain("grants");
  });

  it.each([
    ["account-mismatch", identity({ accountId: "222bb318-a72e-49aa-a8d7-a6169f889007" })],
    ["subject-mismatch", identity({ subjectType: "Trader" })],
    ["session-mismatch", identity({ sessionId: "422bb318-a72e-49aa-a8d7-a6169f889007" })],
    ["invalid-payload", { accessToken: secretCanaries[0] }],
  ] as const)("rejects identity %s before requesting permissions", async (reason, payload) => {
    const transport = backend([{ status: "success", httpStatus: 200, data: payload }]);
    await expect(loadApplicationContext(granted(), transport)).resolves.toEqual({
      status: "invalid-data",
      endpoint: "identity",
      reason,
    });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["account-mismatch", { ...staffPayload(), accountId: "222bb318-a72e-49aa-a8d7-a6169f889007" }],
    ["subject-mismatch", { ...staffPayload(), subjectType: "Trader", isCooperativeOwner: false }],
    ["phase-mismatch", { ...staffPayload(), requiresPhoneVerification: true }],
    ["invalid-payload", { password: secretCanaries[2] }],
  ] as const)("rejects permissions %s after trusted identity", async (reason, payload) => {
    const transport = backend([
      { status: "success", httpStatus: 200, data: identity() },
      { status: "success", httpStatus: 200, data: payload },
    ]);
    await expect(loadApplicationContext(granted(), transport)).resolves.toEqual({
      status: "invalid-data",
      endpoint: "permissions",
      reason,
    });
  });

  it.each([
    ["identity", { status: "http-error", httpStatus: 401, code: "MSG19" }],
    ["permissions", { status: "timeout" }],
  ] as const)("returns a redacted diagnostic when %s fails", async (endpoint, failure) => {
    const transport = backend(endpoint === "identity"
      ? [failure as BackendTransportResult]
      : [
          { status: "success", httpStatus: 200, data: identity() },
          failure as BackendTransportResult,
        ]);
    const result = await loadApplicationContext(granted(), transport);
    expect(result).toMatchObject({
      status: "backend-failure",
      endpoint,
      diagnostic: { event: "backend-request", endpoint },
    });
    expect(JSON.stringify(result)).not.toContain("MSG19");
    expect(JSON.stringify(result)).not.toContain(accessToken);
  });

  it("redacts unexpected requester exceptions", async () => {
    const transport = {
      request: vi.fn(async () => {
        throw new Error(secretCanaries[0]);
      }),
    };
    const result = await loadApplicationContext(granted(), transport);
    expect(result).toEqual({
      status: "backend-failure",
      endpoint: "identity",
      diagnostic: {
        event: "backend-request",
        endpoint: "identity",
        outcome: "unavailable",
      },
    });
    expect(JSON.stringify(result)).not.toContain(secretCanaries[0]);
  });
});
