import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { newSession, otherAccountId, sessionValues } from "@/server/auth/__tests__/session-fixture";
import type { SessionStore } from "@/server/auth/session-store";

// Opt-in. A configured-but-unreachable/invalid endpoint FAILS instead of silently skipping.
const endpoint = process.env.OMTS_TEST_REDIS_URL;
type Connected = Extract<Awaited<ReturnType<typeof connectSessionRedis>>, { status: "connected" }>;

describe.skipIf(endpoint === undefined)("live Redis session adapter (requires OMTS_TEST_REDIS_URL)", () => {
  const namespace = `test-${randomUUID()}`;
  const connections: Connected["connection"][] = [];
  let first: SessionStore;
  let second: SessionStore;
  const key = (hash: string) => `omts:bff:v1:${namespace}:${hash}`;
  function input(ttlMs = 10_000) {
    const now = Date.now();
    return newSession({ idHash: randomBytes(32).toString("hex"), accessExpiresAtMs: now + 100,
      expiresAtMs: now + ttlMs, refreshExpiresAtMs: now + 60_000 });
  }
  async function create(value = input()) {
    const result = await first.create(value);
    if (result.status !== "created") throw new Error(`Live Redis create failed: ${result.status}`);
    return result.session;
  }

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const result = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
      if (result.status !== "connected") throw new Error(`Live Redis setup failed: ${result.status}`);
      connections.push(result.connection);
    }
    first = createRedisSessionStore(connections[0].commands, namespace);
    second = createRedisSessionStore(connections[1].commands, namespace);
  }, 10_000);
  // No FLUSHALL, shared-key scan or delete. Only test-owned keys with short TTLs are created.
  afterAll(() => { for (const connection of connections) connection.close(); });

  it("executes NX so concurrent creation has one winner", async () => {
    const value = input();
    const results = await Promise.all([first.create(value), second.create(value)]);
    expect(results.map((r) => r.status).sort()).toEqual(["created", "exists"]);
    expect((await second.read(value.idHash)).status).toBe("found");
  });
  it("executes CAS across independent connections with one winner", async () => {
    const session = await create();
    const results = await Promise.all([
      first.compareAndSet(session.idHash, session.revision, sessionValues(session)),
      second.compareAndSet(session.idHash, session.revision, sessionValues(session)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["conflict", "updated"]);
  });
  it("revoke leaves a payload-free tombstone; stale CAS cannot revive it", async () => {
    const session = await create();
    await expect(first.revoke(session.idHash)).resolves.toEqual({ status: "revoked" });
    await expect(second.compareAndSet(session.idHash, session.revision, sessionValues(session))).resolves.toEqual({ status: "revoked" });
    await expect(second.revoke(session.idHash)).resolves.toEqual({ status: "already-revoked" });
    await expect(first.create({ ...input(), idHash: session.idHash })).resolves.toEqual({ status: "exists" });
    const raw = await connections[0].commands.get(key(session.idHash));
    expect(JSON.parse(String(raw))).toEqual({ kind: "revoked", schemaVersion: 1, idHash: session.idHash, expiresAtMs: session.expiresAtMs });
  });
  it("separates namespaces and different account/session keys", async () => {
    const session = await create();
    const other = await create(newSession({ ...input(), identity: { ...session.identity, accountId: otherAccountId } }));
    expect(await second.read(other.idHash)).toMatchObject({ status: "found", session: { identity: { accountId: otherAccountId } } });
    expect(await second.read(session.idHash)).toMatchObject({ status: "found", session: { identity: session.identity } });
    const isolated = createRedisSessionStore(connections[1].commands, `${namespace}-other`);
    await expect(isolated.read(session.idHash)).resolves.toEqual({ status: "missing" });
    await expect(first.read(input().idHash)).resolves.toEqual({ status: "missing" });
  });
  it("never acknowledges revoke while a concurrent update keeps the session active", async () => {
    const session = await create();
    const [revoke, update] = await Promise.all([
      first.revoke(session.idHash),
      second.compareAndSet(session.idHash, session.revision, sessionValues(session)),
    ]);
    expect(["revoked", "unavailable"]).toContain(revoke.status);
    expect(["updated", "conflict", "revoked"]).toContain(update.status);
    const current = await second.read(session.idHash);
    if (revoke.status === "revoked") expect(current.status).toBe("revoked");
    else {
      expect(update.status).toBe("updated");
      expect(current.status).toBe("found");
    }
  });
  it("physically expires both active entries and tombstones without extending TTL", async () => {
    const active = await create(input(1500));
    const revoked = await create(input(1500));
    await expect(first.revoke(revoked.idHash)).resolves.toEqual({ status: "revoked" });
    await new Promise((resolve) => setTimeout(resolve, Math.max(active.expiresAtMs, revoked.expiresAtMs) - Date.now() + 150));
    await expect(connections[0].commands.get(key(active.idHash))).resolves.toBeNull();
    await expect(connections[0].commands.get(key(revoked.idHash))).resolves.toBeNull();
    await expect(second.read(active.idHash)).resolves.toEqual({ status: "missing" });
  });
  it("fails closed after connection disposal, without runtime RAM fallback", async () => {
    const result = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
    if (result.status !== "connected") throw new Error(`Live Redis setup failed: ${result.status}`);
    const store = createRedisSessionStore(result.connection.commands, namespace);
    result.connection.close();
    await expect(store.create(input())).resolves.toEqual({ status: "unavailable" });
    await expect(store.read(input().idHash)).resolves.toEqual({ status: "unavailable" });
  });
});
