import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createBffSessionReader } from "@/features/auth/api/bff-session-reader";
import {
  grant,
  permission,
  staffPayload,
  summary,
  zoneA,
} from "@/features/access/api/__fixtures__/permissions";
import { createSessionGateway } from "./session-gateway";
import { createSessionHttpHandlers } from "./session-http";
import { createSessionId } from "./session-id";
import {
  ResolvedServerSession,
  type ServerSessionResolution,
} from "./server-session-resolver";
import {
  accountId,
  newSession,
  otherAccountId,
} from "./__tests__/session-fixture";
import type { SessionPhase } from "./session-store";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
});

function harness(phase: SessionPhase = "application") {
  const environment = {
    NODE_ENV: "test",
    OMTS_DATA_SOURCE: "api",
    OMTS_API_BASE_URL: "http://127.0.0.1:5280",
    OMTS_API_TIMEOUT_MS: "1000",
    OMTS_WEB_ORIGIN: "http://localhost:3000",
    OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
  };
  const cookies = [createSessionId(), createSessionId()].map(
    (id) => `omts_web_sid_dev=${id.sid}`,
  );
  const accounts = [accountId, otherAccountId];
  const sessions = new Map(
    cookies.map((cookie, index) => [
      cookie,
      new ResolvedServerSession(
        {
          ...newSession({
            phase,
            identity: {
              accountId: accounts[index],
              backendSessionId: accounts[index],
              subjectType: "Staff",
            },
          }),
          schemaVersion: 1,
          createdAtMs: 1,
          revision: "fixture-revision",
        },
        `fixture-access-${index}`,
      ),
    ]),
  );
  // Deliberately fake resolution/transport: this verifies the assembled read
  // contract, not Redis, token decryption, network I/O or cookie acceptance.
  const resolve = vi.fn(
    async (cookie: unknown): Promise<ServerSessionResolution> => {
      const session = sessions.get(String(cookie));
      return session
        ? { status: "resolved", session }
        : { status: "anonymous" };
    },
  );
  const request = vi.fn(
    async (raw: unknown): Promise<BackendTransportResult> => {
      const input = raw as BackendRequest;
      if (input.endpoint !== "identity" && input.endpoint !== "permissions")
        throw new Error("Unexpected fixture endpoint");
      const index = input.accessToken === "fixture-access-1" ? 1 : 0;
      const data =
        input.endpoint === "identity"
          ? {
              accountId: accounts[index],
              sessionId: accounts[index],
              subjectType: "Staff",
              username: `fixture.user.${index}`,
              accessToken: "must-not-escape",
              organizationName: "must-not-be-inferred",
            }
          : staffPayload({
              accountId: accounts[index],
              functions: [summary(), summary({ function: "WORK_ASSIGNMENTS" })],
              grants: [
                grant({
                  permissions: [
                    permission(),
                    permission({
                      functionCode: "WORK_ASSIGNMENTS",
                      dataScope: "OwnRecords",
                    }),
                  ],
                }),
              ],
            });
      return { status: "success", httpStatus: 200, data };
    },
  );
  const gateway = createSessionGateway(
    environment,
    async () => ({
      status: "ready",
      runtime: {
        resolve,
        resolveApplication: vi.fn(),
        close: vi.fn(),
      },
    }),
    { request },
  );
  disposers.push(gateway.dispose);
  const handler = createSessionHttpHandlers(environment, gateway);
  const readResponseFor = (cookie?: string) =>
    handler.read(
      new Request(environment.OMTS_WEB_ORIGIN + "/api/auth/session", {
        headers: cookie ? { Cookie: cookie } : {},
      }),
    );
  const readerFor = (cookie?: string) =>
    createBffSessionReader(async (path) => {
      expect(path).toBe("/api/auth/session");
      return readResponseFor(cookie);
    });
  return { cookies, request, resolve, readerFor, readResponseFor };
}

describe("gateway/DAL/HTTP response to browser hydration contract", () => {
  it.each(["identity", "permissions"] as const)(
    "does not serialize extra credential fields from backend %s into HTTP JSON",
    async (endpoint) => {
      const h = harness();
      const original = h.request.getMockImplementation()!;
      // Generated, synthetic sentinels: never real credentials or a network call.
      const sensitiveValue = randomUUID();
      const extraFields = {
        password: sensitiveValue,
        passwordHash: sensitiveValue,
        accessToken: sensitiveValue,
        refreshToken: sensitiveValue,
        connectionString: sensitiveValue,
        credentials: { value: sensitiveValue },
      };
      h.request.mockImplementation(async (input) => {
        const result = await original(input);
        if (
          (input as BackendRequest).endpoint !== endpoint ||
          result.status !== "success"
        )
          return result;
        return {
          ...result,
          data: { ...(result.data as Record<string, unknown>), ...extraFields },
        };
      });

      // Check the wire response, not only the client parser which could hide a leak.
      const response = await h.readResponseFor(h.cookies[0]);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      const body = await response.text();
      expect(body).not.toContain(sensitiveValue);
      for (const field of Object.keys(extraFields))
        expect(body).not.toContain(`"${field}"`);
      expect(JSON.parse(body)).toMatchObject({
        status: "authenticated",
        identity: { accountId },
      });
    },
  );

  it("does not echo a transport exception into the unavailable HTTP response", async () => {
    const h = harness();
    const sensitiveValue = randomUUID();
    h.request.mockRejectedValueOnce(new Error(sensitiveValue));

    const response = await h.readResponseFor(h.cookies[0]);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const body = await response.text();
    expect(body).not.toContain(sensitiveValue);
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
  });

  it("accepts an actual projected handler response without tokens, backend sessionId or invented organization", async () => {
    const h = harness();
    const result = await h.readerFor(h.cookies[0]).read();
    expect(result.status).toBe("authenticated");
    if (result.status !== "authenticated") throw new Error("Expected session");
    expect(result.identity).toEqual({
      accountId,
      username: "fixture.user.0",
      subjectType: "Staff",
    });
    expect(result.permissions.functionPermissions).toEqual(
      expect.arrayContaining([
        {
          functionCode: "WORK_ASSIGNMENTS",
          action: "View",
          scope: { kind: "zones", zoneIds: [zoneA] },
          dataScope: "OwnRecords",
        },
        {
          functionCode: "WATER_MEASUREMENTS",
          action: "View",
          scope: { kind: "zones", zoneIds: [zoneA] },
          dataScope: "AssignedZone",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("must-not-");
    expect(JSON.stringify(result)).not.toContain("sessionId");
    expect(
      h.request.mock.calls.map(([input]) => (input as BackendRequest).endpoint),
    ).toEqual(["identity", "permissions"]);
  });

  it("isolates account A and B while sharing the same gateway", async () => {
    const h = harness();
    const [first, second] = await Promise.all(
      h.cookies.map((cookie) => h.readerFor(cookie).read()),
    );
    expect(first).toMatchObject({
      status: "authenticated",
      identity: { accountId, username: "fixture.user.0" },
    });
    expect(second).toMatchObject({
      status: "authenticated",
      identity: { accountId: otherAccountId, username: "fixture.user.1" },
    });
  });

  it.each([
    "password-change-required",
    "contact-verification-required",
  ] as const)(
    "returns limited phase %s without fetching private application context",
    async (phase) => {
      const h = harness(phase);
      expect(await h.readerFor(h.cookies[0]).read()).toMatchObject({
        status: "onboarding-required",
        phase,
      });
      expect(h.request).not.toHaveBeenCalled();
    },
  );

  it("does not fetch backend data for an anonymous read", async () => {
    const h = harness();
    expect(await h.readerFor().read()).toEqual({
      status: "anonymous",
      clearCookie: false,
    });
    expect(h.request).not.toHaveBeenCalled();
  });

  it("returns unavailable rather than a successful partial session when permissions fail", async () => {
    const h = harness();
    const original = h.request.getMockImplementation()!;
    h.request.mockImplementation(async (input) =>
      (input as BackendRequest).endpoint === "permissions"
        ? { status: "unavailable" }
        : original(input),
    );
    expect(await h.readerFor(h.cookies[0]).read()).toEqual({
      status: "unavailable",
    });
  });

  it("does not hydrate a mismatched backend account", async () => {
    const h = harness();
    h.request.mockResolvedValueOnce({
      status: "success",
      httpStatus: 200,
      data: {
        accountId: otherAccountId,
        sessionId: accountId,
        username: "wrong.user",
        subjectType: "Staff",
      },
    });
    expect(await h.readerFor(h.cookies[0]).read()).toEqual({
      status: "unavailable",
    });
    expect(h.request).toHaveBeenCalledOnce();
  });

  it("discards projected data if the BFF session is revoked while backend data is loading", async () => {
    const h = harness();
    const original = h.resolve.getMockImplementation()!;
    h.resolve
      .mockImplementationOnce(original)
      .mockResolvedValueOnce({
        status: "invalid-session",
        reason: "revoked",
        clearCookie: true,
      });
    expect(await h.readerFor(h.cookies[0]).read()).toEqual({
      status: "anonymous",
      clearCookie: true,
    });
    expect(h.resolve).toHaveBeenCalledTimes(2);
  });
});
