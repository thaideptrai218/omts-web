import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { openApiSessionRuntime } from "./api-session-runtime";
import { accountId, staffPayload } from "@/features/access/api/__fixtures__/permissions";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";

const endpoint = process.env.OMTS_TEST_REDIS_URL;
describe.skipIf(!endpoint)("G1 composed runtime with live Redis", () => {
  async function setup(forcedPassword = false) {
    const environment = { NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:8080", OMTS_API_TIMEOUT_MS: "1000",
      OMTS_WEB_ORIGIN: "http://localhost:3002", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
      OMTS_WEB_SESSION_ACTIVE_KEY_ID: "test", OMTS_WEB_SESSION_KEYRING: `test=${randomBytes(32).toString("base64url")}`,
      OMTS_WEB_SESSION_REDIS_URL: endpoint, OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "1500", OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "1500",
      OMTS_WEB_SESSION_REDIS_NAMESPACE: `runtime-${randomUUID()}`, OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS: "1800000", OMTS_WEB_AUTH_PENDING_TIMEOUT_MS: "120000" };
    let changed = false;
    const newBackendSession = randomUUID();
    const tokens = () => ({ accountId, displayName: "Fixture", subjectType: "Staff",
        accessToken: "fixture-access", refreshToken: "fixture-refresh", accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 120_000).toISOString(), mustChangePassword: forcedPassword && !changed, phoneVerificationRequired: false });
    const request = vi.fn(async (input: BackendRequest): Promise<BackendTransportResult> => {
      if (input.endpoint === "login") return { status: "success", httpStatus: 200, data: tokens() };
      if (input.endpoint === "passwordChange") {
        if (input.body.currentPassword === "wrong-password") return { status: "http-error", httpStatus: 400, code: "MSG17" };
        changed = true; return { status: "success", httpStatus: 200, data: { tokens: tokens(), message: "Changed" } };
      }
      if (input.endpoint === "identity") return { status: "success", httpStatus: 200, data: { accountId, sessionId: changed ? newBackendSession : accountId, username: "fixture", subjectType: "Staff" } };
      if (input.endpoint === "permissions") return { status: "success", httpStatus: 200, data: staffPayload() };
      return { status: "success", httpStatus: 204, data: undefined };
    });
    const opened = await openApiSessionRuntime(environment, { request });
    if (opened.status !== "ready") throw new Error(`Runtime not ready: ${opened.status}`);
    return { runtime: opened.runtime, request };
  }
  it("completes bootstrap → one login → resolve → logout and rejects the old cookie", async () => {
    const { runtime, request } = await setup();
    try {
      const bootstrap = await runtime.bootstrap(null);
      if (bootstrap.status !== "ready" || !bootstrap.contextCookie) throw new Error("Bootstrap did not prepare a cookie");
      const context = bootstrap.contextCookie.readForResponseHeader().split(";")[0];
      const results = await Promise.all(Array.from({ length: 5 }, () => runtime.login(context, { identifier: "fixture", password: "fixture-password" }, new AbortController().signal)));
      expect(request.mock.calls.filter(([input]) => input.endpoint === "login")).toHaveLength(1);
      const created = results.find((result) => result.status === "created");
      if (created?.status !== "created" || !created.cookie) throw new Error("Login not created");
      const header = `${context}; ${created.cookie.readForResponseHeader().split(";")[0]}`;
      expect((await runtime.resolve(header)).status).toBe("resolved");
      const active = await runtime.bootstrap(header);
      expect((await runtime.logout(header, "00000000-0000-4000-8000-000000000000")).status).toBe("reset-required");
      expect((await runtime.resolve(header)).status).toBe("resolved");
      expect((await runtime.logout(header, active.revision)).status).toBe("signed-out");
      expect((await runtime.resolve(header)).status).toBe("invalid-session");
    } finally { runtime.close(); }
  });
  it("rotates a forced-password session after success and retains the old binding on a known rejection", async () => {
    const { runtime } = await setup(true);
    try {
      const bootstrap = await runtime.bootstrap(null);
      if (bootstrap.status !== "ready" || !bootstrap.contextCookie) throw new Error("Missing fixture context");
      const context = bootstrap.contextCookie.readForResponseHeader().split(";")[0];
      const login = await runtime.login(context, { identifier: "fixture", password: "fixture-password" }, new AbortController().signal);
      if (login.status !== "created" || !login.cookie) throw new Error("Missing fixture session");
      expect(login.destination).toBe("/onboarding/password");
      const oldHeader = `${context}; ${login.cookie.readForResponseHeader().split(";")[0]}`;
      const wrong = await runtime.changePassword(oldHeader, { currentPassword: "wrong-password", newPassword: "new-password-123", confirmPassword: "new-password-123" }, new AbortController().signal);
      expect(wrong.status).toBe("rejected");
      expect((await runtime.resolve(oldHeader)).status).toBe("resolved");
      const changed = await runtime.changePassword(oldHeader, { currentPassword: "fixture-password", newPassword: "new-password-123", confirmPassword: "new-password-123" }, new AbortController().signal);
      if (changed.status !== "created" || !changed.cookie) throw new Error("Missing rotated session");
      expect(changed.destination).toBe("/dashboard");
      expect((await runtime.resolve(oldHeader)).status).toBe("invalid-session");
      const currentHeader = `${context}; ${changed.cookie.readForResponseHeader().split(";")[0]}`;
      const active = await runtime.resolve(currentHeader);
      expect(active.status).toBe("resolved");
      if (active.status === "resolved") expect(active.session.phase).toBe("application");
      const state = await runtime.bootstrap(currentHeader); await runtime.logout(currentHeader, state.revision);
    } finally { runtime.close(); }
  });
  it("rotates through G1 after a server-held email proof without sending a current password", async () => {
    const { runtime, request } = await setup();
    try {
      const bootstrap = await runtime.bootstrap(null);
      if (bootstrap.status !== "ready" || !bootstrap.contextCookie) throw new Error("Missing fixture context");
      const context = bootstrap.contextCookie.readForResponseHeader().split(";")[0];
      const login = await runtime.login(context, { identifier: "fixture", password: "fixture-password" }, new AbortController().signal);
      if (login.status !== "created" || !login.cookie) throw new Error("Missing fixture session");
      const oldHeader = `${context}; ${login.cookie.readForResponseHeader().split(";")[0]}`;
      const changed = await runtime.changePassword(oldHeader, { newPassword: "NewValid123", confirmPassword: "NewValid123" }, new AbortController().signal, "server-proof");
      if (changed.status !== "created" || !changed.cookie) throw new Error("Proof rotation failed");
      const sent = request.mock.calls.find(([input]) => input.endpoint === "passwordChange")?.[0];
      expect(sent?.endpoint === "passwordChange" && sent.body).toMatchObject({ verificationToken: "server-proof", newPassword: "NewValid123", clientType: "Web" });
      expect(sent?.endpoint === "passwordChange" && sent.body.currentPassword).toBeUndefined();
      expect((await runtime.resolve(oldHeader)).status).toBe("invalid-session");
      const nextHeader = `${context}; ${changed.cookie.readForResponseHeader().split(";")[0]}`; expect((await runtime.resolve(nextHeader)).status).toBe("resolved");
      const state = await runtime.bootstrap(nextHeader); await runtime.logout(nextHeader, state.revision);
    } finally { runtime.close(); }
  });
});
