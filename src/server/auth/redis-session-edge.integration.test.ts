import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { createRedisIntegrationFixture } from "@/server/auth/__tests__/redis-integration-fixture";
import { holdNextRedisGet } from "@/server/auth/__tests__/redis-read-gate";
import { liveSessionInput, requireCreated } from "@/server/auth/__tests__/session-store-contract";
import { withTestDeadline } from "@/server/auth/__tests__/redis-transport-fixture";
import { fixtureTokens, tokenContext, tokenHarness } from "@/server/auth/__tests__/token-protection-fixture";
import { sessionValues } from "@/server/auth/__tests__/session-fixture";

const endpoint = process.env.OMTS_TEST_REDIS_URL;
type Fixture = Awaited<ReturnType<typeof createRedisIntegrationFixture>>;
const putRawScript = "return redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])";

describe.skipIf(endpoint === undefined)("live Redis deterministic races and boundaries", () => {
  let h: Fixture;
  beforeAll(async () => { h = await createRedisIntegrationFixture(endpoint ?? ""); }, 10_000);
  afterAll(() => { h?.close(); });

  it("Lua refuses a stale update when revoke happens between GET and EVAL", async () => {
    const session = await h.create();
    const gate = holdNextRedisGet(h.commands);
    const paused = createRedisSessionStore(gate.commands, h.namespace);
    const work = paused.compareAndSet(session.idHash, session.revision, sessionValues(session));
    try {
      await withTestDeadline(gate.captured);
      await expect(h.second.revoke(session.idHash)).resolves.toEqual({ status: "revoked" });
    } finally { gate.release(); }
    await expect(work).resolves.toEqual({ status: "conflict" });
    expect(gate.reply()).toBe("changed");
    await expect(h.first.read(session.idHash)).resolves.toEqual({ status: "revoked" });
  });
  it("Lua does not acknowledge revoke when an update wins between GET and EVAL", async () => {
    const session = await h.create();
    const gate = holdNextRedisGet(h.commands);
    const work = createRedisSessionStore(gate.commands, h.namespace).revoke(session.idHash);
    try {
      await withTestDeadline(gate.captured);
      expect((await h.second.compareAndSet(session.idHash, session.revision, sessionValues(session))).status).toBe("updated");
    } finally { gate.release(); }
    await expect(work).resolves.toEqual({ status: "unavailable" });
    expect(gate.reply()).toBe("changed");
    expect((await h.first.read(session.idHash)).status).toBe("found");
  });
  it("does not overwrite corruption introduced after a validated GET", async () => {
    const session = await h.create();
    const gate = holdNextRedisGet(h.commands);
    const work = createRedisSessionStore(gate.commands, h.namespace)
      .compareAndSet(session.idHash, session.revision, sessionValues(session));
    try {
      await withTestDeadline(gate.captured);
      await h.commands.eval(putRawScript, { keys: [h.key(session.idHash)], arguments: ["{", "60000"] });
    } finally { gate.release(); }
    await expect(work).resolves.toEqual({ status: "conflict" });
    expect(gate.reply()).toBe("changed");
    await expect(h.commands.get(h.key(session.idHash))).resolves.toBe("{");
    await expect(h.first.read(session.idHash)).resolves.toEqual({ status: "unavailable" });
  });
  it("an expired key cannot be revived by a delayed update asking for a longer lifetime", async () => {
    const input = { ...liveSessionInput(), expiresAtMs: Date.now() + 1000 };
    const session = await requireCreated(h.first, input);
    const gate = holdNextRedisGet(h.commands);
    const paused = createRedisSessionStore(gate.commands, h.namespace, () => session.createdAtMs);
    const work = paused.compareAndSet(session.idHash, session.revision, {
      ...sessionValues(session), expiresAtMs: session.expiresAtMs + 5000,
    });
    try {
      await withTestDeadline(gate.captured);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, session.expiresAtMs - Date.now()) + 100));
    } finally { gate.release(); }
    await expect(work).resolves.toEqual({ status: "missing" });
    expect(gate.reply()).toBe("missing");
    await expect(h.commands.get(h.key(session.idHash))).resolves.toBeNull();
  });
  it("uses Redis TIME to reject an expiry accepted by a skewed application clock", async () => {
    const now = Date.now();
    const input = { ...liveSessionInput(), expiresAtMs: now - 1000 };
    const skewed = createRedisSessionStore(h.commands, h.namespace, () => now - 10_000);
    await expect(skewed.create(input)).resolves.toEqual({ status: "invalid-input" });
    await expect(h.commands.get(h.key(input.idHash))).resolves.toBeNull();
  });
  it("round-trips a genuine encrypted envelope without persisting plaintext fixture tokens", async () => {
    const input = liveSessionInput();
    const { idHash, identity, phase, accessExpiresAtMs, refreshExpiresAtMs, expiresAtMs } = input;
    const context = tokenContext({ idHash, identity, phase, accessExpiresAtMs, refreshExpiresAtMs, expiresAtMs });
    const crypto = tokenHarness();
    const session = await requireCreated(h.first, { ...input, protectedTokens: await crypto.seal(context) });
    const read = await h.second.read(session.idHash);
    if (read.status !== "found") throw new Error(`Expected live session, received ${read.status}`);
    await expect(crypto.protector.open(read.session.protectedTokens, context)).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
    const raw = await h.commands.get(h.key(session.idHash));
    expect(raw).not.toContain(fixtureTokens.accessToken);
    expect(raw).not.toContain(fixtureTokens.refreshToken);
  });
  it("keeps active records and tombstones across client replacement, not a Redis server restart", async () => {
    const original = await createRedisIntegrationFixture(endpoint ?? "");
    let replacement: Extract<Awaited<ReturnType<typeof connectSessionRedis>>, { status: "connected" }> | undefined;
    try {
      const active = await original.create();
      const revoked = await original.create();
      await expect(original.first.revoke(revoked.idHash)).resolves.toEqual({ status: "revoked" });
      original.close();
      const connected = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
      if (connected.status !== "connected") throw new Error(`Live Redis reconnect failed: ${connected.status}`);
      replacement = connected;
      const fresh = createRedisSessionStore(connected.connection.commands, original.namespace);
      await expect(fresh.read(active.idHash)).resolves.toEqual({ status: "found", session: active });
      await expect(fresh.read(revoked.idHash)).resolves.toEqual({ status: "revoked" });
      await expect(original.first.read(active.idHash)).resolves.toEqual({ status: "unavailable" });
    } finally { original.close(); replacement?.connection.close(); }
  }, 10_000);
});
