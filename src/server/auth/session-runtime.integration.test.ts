import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { connectSessionRedis } from "./session-redis-client";
import { createRedisSessionStore } from "./redis-session-store";
import { parseServerSessionKeyring } from "./session-keyring-config";
import { createSessionTokenProtector } from "./session-token-protector";
import { openServerSessionReadRuntime, type ServerSessionReadRuntime } from "./server-session-runtime";
import { createSessionId } from "./session-id";
import type { SessionPhase, SessionStore } from "./session-store";
import { initialTime, newSession } from "./__tests__/session-fixture";

const endpoint = process.env.OMTS_TEST_REDIS_URL;

describe.skipIf(!endpoint)("session runtime with dedicated live Redis", () => {
  let runtime: ServerSessionReadRuntime;
  let store: SessionStore;
  let close: () => void;
  const key = randomBytes(32).toString("base64url");
  const environment = {
    NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://127.0.0.1:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
    OMTS_WEB_SESSION_REDIS_URL: endpoint,
    OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "2500", OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "2500",
    OMTS_WEB_SESSION_REDIS_NAMESPACE: `runtime-${randomUUID()}`,
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: "integration-key", OMTS_WEB_SESSION_KEYRING: `integration-key=${key}`,
  };

  beforeAll(async () => {
    const connection = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
    if (connection.status !== "connected") throw new Error("Dedicated Redis unavailable");
    close = connection.connection.close;
    store = createRedisSessionStore(connection.connection.commands, environment.OMTS_WEB_SESSION_REDIS_NAMESPACE);
    const opened = await openServerSessionReadRuntime(environment);
    if (opened.status !== "ready") { close(); throw new Error("Session runtime unavailable"); }
    runtime = opened.runtime;
  });

  afterAll(() => { runtime?.close(); close?.(); });

  async function seed(phase: SessionPhase) {
    const keys = parseServerSessionKeyring(environment);
    if (keys.status !== "valid") throw new Error("Invalid fixture keys");
    const id = createSessionId();
    const now = Math.max(initialTime, Date.now());
    const draft = newSession({
      idHash: id.idHash, phase, accessExpiresAtMs: now + 60_000,
      refreshExpiresAtMs: now + 120_000, expiresAtMs: now + 60_000,
    });
    const protectedResult = await createSessionTokenProtector(keys.provider).protect({
      accessToken: "live-fixture-access", refreshToken: "live-fixture-refresh",
    }, {
      idHash: draft.idHash, identity: draft.identity, phase: draft.phase,
      accessExpiresAtMs: draft.accessExpiresAtMs, refreshExpiresAtMs: draft.refreshExpiresAtMs,
      expiresAtMs: draft.expiresAtMs,
    });
    if (protectedResult.status !== "protected") throw new Error("Cannot protect fixture");
    const created = await store.create({ ...draft, protectedTokens: protectedResult.protectedTokens });
    if (created.status !== "created") throw new Error("Cannot create fixture session");
    return { cookie: `omts_web_sid_dev=${id.sid}`, idHash: id.idHash };
  }

  it.each(["application", "password-change-required", "contact-verification-required"] as const)(
    "reads encrypted %s sessions through actual Redis/config/keyring", async (phase) => {
      const seeded = await seed(phase);
      const result = await runtime.resolveApplication(seeded.cookie);
      expect(result.status).toBe(phase === "application" ? "granted" : "onboarding-required");
      if (result.status === "granted") expect(result.session.readAccessTokenForBackend()).toBe("live-fixture-access");
    },
  );

  it("sees revocation made on another Redis connection", async () => {
    const seeded = await seed("application");
    expect((await runtime.resolve(seeded.cookie)).status).toBe("resolved");
    expect((await store.revoke(seeded.idHash)).status).toBe("revoked");
    await expect(runtime.resolve(seeded.cookie)).resolves.toMatchObject({ status: "invalid-session", reason: "revoked" });
  });
});
