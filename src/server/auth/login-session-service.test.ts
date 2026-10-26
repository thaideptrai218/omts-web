import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { accountId, staffPayload } from "@/features/access/api/__fixtures__/permissions";
import { createMemorySessionStoreForTests } from "./__tests__/memory-session-store";
import { initialTime } from "./__tests__/session-fixture";
import { tokenHarness } from "./__tests__/token-protection-fixture";
import { createLoginSessionService } from "./login-session-service";
import { hashSessionId } from "./session-id";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";

const environment = { NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://localhost:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };
const password = " test-password-1 ";
const accessToken = "fixture-login-access";
const refreshToken = "fixture-login-refresh";

function harness(change: Record<string, unknown> = {}) {
  const tokens = {
    accountId, displayName: "Người kiểm thử", subjectType: "Staff",
    accessToken, refreshToken, accessTokenExpiresAt: new Date(initialTime + 60_000).toISOString(),
    refreshTokenExpiresAt: new Date(initialTime + 120_000).toISOString(),
    mustChangePassword: false, phoneVerificationRequired: false, ...change,
  };
  const identity = { accountId, sessionId: "322bb318-a72e-49aa-a8d7-a6169f889007", username: "fixture.user", subjectType: "Staff" };
  const request = vi.fn(async (input: BackendRequest): Promise<BackendTransportResult> => {
    switch (input.endpoint) {
      case "login": return { status: "success", httpStatus: 200, data: tokens };
      case "identity": return { status: "success", httpStatus: 200, data: identity };
      case "permissions": return { status: "success", httpStatus: 200, data: staffPayload() };
      default: return { status: "success", httpStatus: 204, data: undefined };
    }
  });
  let now = initialTime;
  const store = createMemorySessionStoreForTests(() => now);
  const protector = tokenHarness().protector;
  const service = createLoginSessionService({ environment, backend: { request }, store, protector, clock: () => now });
  return { service, store, protector, request, tokens, identity, setTime(value: number) { now = value; } };
}

describe("server login session creation without a public login handler", () => {
  it("trims identifier, preserves password and forces the server-owned Web client type", async () => {
    const h = harness();
    const result = await h.service.login({ identifier: "  fixture.user  ", password, clientType: "Mobile" });
    expect(result.status).toBe("created");
    expect(h.request).toHaveBeenNthCalledWith(1, {
      endpoint: "login", body: { identifier: "fixture.user", password, clientType: "Web" },
    });
    if (result.status !== "created") throw new Error("Expected created fixture");
    expect(() => JSON.stringify(result)).toThrow("SESSION_COOKIE_NOT_SERIALIZABLE");
    const sid = /^omts_web_sid_dev=([^;]+)/.exec(result.cookie.readForResponseHeader())?.[1];
    const hash = hashSessionId(sid);
    if (!hash) throw new Error("Expected cookie SID");
    const stored = await h.store.read(hash);
    expect(stored.status).toBe("found");
    if (stored.status !== "found") throw new Error("Expected stored session");
    expect(stored.session.identity.backendSessionId).toBe(h.identity.sessionId);
    expect(stored.session.expiresAtMs).toBe(initialTime + 60_000);
    const record = JSON.stringify(stored);
    for (const secret of [accessToken, refreshToken, password]) expect(record).not.toContain(secret);
  });

  it.each([
    [true, true, "password-change-required"],
    [true, false, "password-change-required"],
    [false, true, "contact-verification-required"],
  ] as const)("keeps password=%s/contact=%s limited without requesting permissions", async (mustChangePassword, phoneVerificationRequired, phase) => {
    const h = harness({ mustChangePassword, phoneVerificationRequired });
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toMatchObject({ status: "created", phase });
    expect(h.request.mock.calls.some(([input]) => input.endpoint === "permissions")).toBe(false);
  });

  it("generates a different SID for each successful login", async () => {
    const h = harness();
    const first = await h.service.login({ identifier: "fixture.user", password });
    const second = await h.service.login({ identifier: "fixture.user", password });
    if (first.status !== "created" || second.status !== "created") throw new Error("Expected sessions");
    expect(first.cookie.readForResponseHeader()).not.toBe(second.cookie.readForResponseHeader());
  });

  it("does not mutate session storage or log out another session on rejected credentials", async () => {
    const h = harness();
    h.request.mockResolvedValueOnce({ status: "http-error", httpStatus: 401, code: "MSG12" });
    const create = vi.spyOn(h.store, "create");
    const revoke = vi.spyOn(h.store, "revoke");
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toMatchObject({
      status: "rejected", httpStatus: 401, code: "MSG12",
    });
    expect(create).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    expect(h.request).toHaveBeenCalledOnce();
  });

  it.each(["identity-mismatch", "permission-gate", "expired"] as const)("refuses %s and requests upstream cleanup without issuing a cookie", async (failure) => {
    const h = harness(failure === "expired" ? { accessTokenExpiresAt: new Date(initialTime).toISOString() } : {});
    if (failure === "identity-mismatch") h.identity.accountId = "222bb318-a72e-49aa-a8d7-a6169f889007";
    if (failure === "permission-gate") {
      const original = h.request.getMockImplementation()!;
      h.request.mockImplementation(async (input) => input.endpoint === "permissions"
        ? { status: "success", httpStatus: 200, data: staffPayload({ requiresPhoneVerification: true }) }
        : original(input));
    }
    const create = vi.spyOn(h.store, "create");
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toEqual({ status: "unavailable" });
    expect(create).not.toHaveBeenCalled();
    expect(h.request).toHaveBeenLastCalledWith({ endpoint: "logout", accessToken });
  });

  it("revokes its own candidate when create committed but its response was lost", async () => {
    const h = harness();
    const actualCreate = h.store.create;
    let candidateHash = "";
    vi.spyOn(h.store, "create").mockImplementation(async (input) => {
      candidateHash = input.idHash;
      await actualCreate(input);
      return { status: "unavailable" };
    });
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toEqual({ status: "unavailable" });
    await expect(h.store.read(candidateHash)).resolves.toEqual({ status: "revoked" });
  });

  it("does not revoke an existing record on a collision response", async () => {
    const h = harness();
    vi.spyOn(h.store, "create").mockResolvedValue({ status: "exists" });
    const revoke = vi.spyOn(h.store, "revoke");
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toEqual({ status: "unavailable" });
    expect(revoke).not.toHaveBeenCalled();
  });

  it("rejects malformed input before any backend/storage request", async () => {
    const h = harness();
    await expect(h.service.login({ identifier: " ", password })).resolves.toEqual({ status: "invalid-input" });
    expect(h.request).not.toHaveBeenCalled();
  });

  it("does not replay a timed-out login", async () => {
    const h = harness();
    h.request.mockResolvedValueOnce({ status: "timeout" });
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toEqual({ status: "unavailable" });
    expect(h.request).toHaveBeenCalledOnce();
  });

  it("rejects a malformed token response without returning its raw fields", async () => {
    const h = harness();
    h.request.mockResolvedValueOnce({ status: "success", httpStatus: 200, data: { accessToken, password } });
    const result = await h.service.login({ identifier: "fixture.user", password });
    expect(result).toEqual({ status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain(accessToken);
    expect(h.request).toHaveBeenCalledOnce();
  });

  it("does not prepare a cookie if the deadline passes while store.create is pending", async () => {
    const h = harness();
    const actualCreate = h.store.create;
    vi.spyOn(h.store, "create").mockImplementation(async (input) => {
      const result = await actualCreate(input);
      h.setTime(input.expiresAtMs);
      return result;
    });
    await expect(h.service.login({ identifier: "fixture.user", password })).resolves.toEqual({ status: "unavailable" });
    expect(h.request).toHaveBeenLastCalledWith({ endpoint: "logout", accessToken });
  });
});
