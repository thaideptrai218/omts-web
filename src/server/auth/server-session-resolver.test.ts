import { inspect } from "node:util";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMemorySessionStoreForTests } from "./__tests__/memory-session-store";
import {
  accountId,
  initialTime,
  newSession,
} from "./__tests__/session-fixture";
import {
  fixtureTokens,
  tokenHarness,
} from "./__tests__/token-protection-fixture";
import { readSessionCookie } from "./session-cookie-reader";
import { createSessionId } from "./session-id";
import type { SessionStore, StoredSession } from "./session-store";
import type { TokenProtectionContext } from "./session-token-format";
import {
  createServerSessionResolver,
  type ServerSessionResolution,
} from "./server-session-resolver";

function context(session: Omit<StoredSession, "schemaVersion" | "createdAtMs" | "revision">): TokenProtectionContext {
  return {
    idHash: session.idHash,
    identity: session.identity,
    phase: session.phase,
    accessExpiresAtMs: session.accessExpiresAtMs,
    refreshExpiresAtMs: session.refreshExpiresAtMs,
    expiresAtMs: session.expiresAtMs,
  };
}

function cookieReader() {
  return {
    read(header: unknown) {
      return readSessionCookie(header, "omts_web_sid_dev");
    },
  };
}

function requestCookie(sid: string): string {
  return `theme=light; omts_web_sid_dev=${sid}; locale=vi`;
}

async function activeHarness() {
  const clock = vi.fn(() => initialTime);
  const store = createMemorySessionStoreForTests(clock);
  const token = tokenHarness();
  const { sid, idHash } = createSessionId();
  const draft = newSession({
    idHash,
    phase: "application",
    accessExpiresAtMs: initialTime + 30_000,
    refreshExpiresAtMs: initialTime + 60_000,
    expiresAtMs: initialTime + 30_000,
  });
  const protectedResult = await token.protector.protect(fixtureTokens, context(draft));
  if (protectedResult.status !== "protected") throw new Error("Expected protected test tokens");
  const created = await store.create({ ...draft, protectedTokens: protectedResult.protectedTokens });
  if (created.status !== "created") throw new Error("Expected active test session");
  const resolver = createServerSessionResolver({
    cookieReader: cookieReader(),
    store,
    tokenOpener: token.protector,
    clock,
  });
  return { clock, store, token, resolver, cookieHeader: requestCookie(sid), stored: created.session };
}

function expectInvalid(result: ServerSessionResolution, reason: string) {
  expect(result).toEqual({ status: "invalid-session", reason, clearCookie: true });
}

describe("server session resolver", () => {
  it("treats a request without the OMTS cookie as anonymous without touching storage", async () => {
    const store = createMemorySessionStoreForTests();
    const read = vi.spyOn(store, "read");
    const opener = { open: vi.fn() };
    const clock = vi.fn(() => initialTime);
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(),
      store,
      tokenOpener: opener,
      clock,
    });

    await expect(resolver.resolve("theme=light")).resolves.toEqual({ status: "anonymous" });
    expect(read).not.toHaveBeenCalled();
    expect(opener.open).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });

  it("rejects malformed or duplicate session cookies before reading Redis", async () => {
    const store = createMemorySessionStoreForTests();
    const read = vi.spyOn(store, "read");
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(),
      store,
      tokenOpener: { open: vi.fn() },
      clock: () => initialTime,
    });

    expectInvalid(await resolver.resolve("omts_web_sid_dev=not-a-sid"), "invalid-cookie");
    const { sid } = createSessionId();
    expectInvalid(
      await resolver.resolve(`omts_web_sid_dev=${sid}; omts_web_sid_dev=${sid}`),
      "invalid-cookie",
    );
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", "missing-session"],
    ["expired", "expired"],
    ["revoked", "revoked"],
  ] as const)("marks a stale cookie for clearing when storage reports %s", async (status, reason) => {
    const { sid, idHash } = createSessionId();
    const base = createMemorySessionStoreForTests();
    const store: SessionStore = { ...base, read: vi.fn(async (hash) => {
      expect(hash).toBe(idHash);
      return { status };
    }) };
    const opener = { open: vi.fn() };
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(), store, tokenOpener: opener, clock: () => initialTime,
    });

    expectInvalid(await resolver.resolve(requestCookie(sid)), reason);
    expect(opener.open).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "invalid-input"] as const)(
    "does not clear a cookie when the store reports %s",
    async (status) => {
      const { sid } = createSessionId();
      const base = createMemorySessionStoreForTests();
      const store: SessionStore = { ...base, read: vi.fn(async () => ({ status })) };
      const resolver = createServerSessionResolver({
        cookieReader: cookieReader(),
        store,
        tokenOpener: { open: vi.fn() },
        clock: () => initialTime,
      });

      await expect(resolver.resolve(requestCookie(sid))).resolves.toEqual({ status: "unavailable" });
    },
  );

  it("fails closed when a stored session violates the access-bound lifetime", async () => {
    const { sid, idHash } = createSessionId();
    const store = createMemorySessionStoreForTests(() => initialTime);
    const created = await store.create(newSession({ idHash }));
    expect(created.status).toBe("created");
    const opener = { open: vi.fn() };
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(), store, tokenOpener: opener, clock: () => initialTime,
    });

    expectInvalid(await resolver.resolve(requestCookie(sid)), "invalid-session");
    expect(opener.open).not.toHaveBeenCalled();
  });

  it("keeps clock and key-provider failures distinct from an invalid user session", async () => {
    const harness = await activeHarness();
    const brokenClock = createServerSessionResolver({
      cookieReader: cookieReader(),
      store: harness.store,
      tokenOpener: harness.token.protector,
      clock: () => { throw new Error("clock-secret"); },
    });
    await expect(brokenClock.resolve(harness.cookieHeader)).resolves.toEqual({ status: "unavailable" });

    const brokenKey = createServerSessionResolver({
      cookieReader: cookieReader(),
      store: harness.store,
      tokenOpener: { open: vi.fn(async () => ({ status: "unavailable" as const })) },
      clock: harness.clock,
    });
    await expect(brokenKey.resolve(harness.cookieHeader)).resolves.toEqual({ status: "unavailable" });
  });

  it("rejects a token envelope that no longer matches the stored session context", async () => {
    const harness = await activeHarness();
    const changed = { ...harness.stored, phase: "contact-verification-required" as const };
    const store: SessionStore = {
      ...harness.store,
      read: vi.fn(async () => ({ status: "found" as const, session: changed })),
    };
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(),
      store,
      tokenOpener: harness.token.protector,
      clock: harness.clock,
    });

    expectInvalid(await resolver.resolve(harness.cookieHeader), "invalid-session");
  });

  it("returns a redacted server capability for an active application session", async () => {
    const harness = await activeHarness();
    const result = await harness.resolver.resolve(harness.cookieHeader);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") throw new Error("Expected resolved session");

    expect(result.session.identity).toEqual({
      accountId,
      backendSessionId: accountId,
      subjectType: "Staff",
    });
    expect(result.session.phase).toBe("application");
    expect(result.session.readIdHashForSessionStore()).toBe(harness.stored.idHash);
    expect(result.session.readAccessTokenForBackend()).toBe(fixtureTokens.accessToken);
    expect(result.session).not.toHaveProperty("refreshToken");
    expect(Object.keys(result.session)).toEqual(["identity", "phase", "revision", "expiresAtMs"]);
    expect(inspect(result.session)).toBe("ResolvedServerSession [REDACTED]");
    expect(String(result.session)).toBe("ResolvedServerSession [REDACTED]");
    expect(() => JSON.stringify(result)).toThrow("RESOLVED_SERVER_SESSION_NOT_SERIALIZABLE");
    expect(inspect(result)).not.toContain(fixtureTokens.accessToken);
    expect(inspect(result)).not.toContain(fixtureTokens.refreshToken);
  });

  it("turns unexpected dependency exceptions into an unavailable result without leaking causes", async () => {
    const { sid } = createSessionId();
    const base = createMemorySessionStoreForTests();
    const cases = [
      createServerSessionResolver({
        cookieReader: { read() { throw new Error("cookie-secret"); } },
        store: base,
        tokenOpener: { open: vi.fn() },
        clock: () => initialTime,
      }),
      createServerSessionResolver({
        cookieReader: cookieReader(),
        store: { ...base, read: async () => { throw new Error("redis-secret"); } },
        tokenOpener: { open: vi.fn() },
        clock: () => initialTime,
      }),
    ];

    for (const resolver of cases) {
      const result = await resolver.resolve(requestCookie(sid));
      expect(result).toEqual({ status: "unavailable" });
      expect(inspect(result)).not.toMatch(/secret/u);
    }
  });

  it("does not grant a capability if expiry passes while the key provider is pending", async () => {
    const harness = await activeHarness();
    let now = initialTime;
    const resolver = createServerSessionResolver({
      cookieReader: cookieReader(), store: harness.store, clock: () => now,
      tokenOpener: { async open(input, context) {
        const result = await harness.token.protector.open(input, context);
        now = harness.stored.expiresAtMs;
        return result;
      } },
    });
    await expect(resolver.resolve(harness.cookieHeader)).resolves.toEqual({
      status: "invalid-session", reason: "expired", clearCookie: true,
    });
  });
});
