import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { redisHarness, storedFixture } from "@/server/auth/__tests__/redis-session-fixture";
import { initialTime, newSession, sessionHash, sessionValues } from "@/server/auth/__tests__/session-fixture";

describe("Redis adapter fail-closed and lifetime boundaries", () => {
  it.each([undefined, 42, "{", "x".repeat(32_769), "{}",
    JSON.stringify({ kind: "active", session: { ...storedFixture(), schemaVersion: 2 } }),
    JSON.stringify({ kind: "active", session: { ...storedFixture(), idHash: "b".repeat(64) } }),
    JSON.stringify({ kind: "active", session: { ...storedFixture(), accessToken: "forbidden-fixture" } }),
    JSON.stringify({ kind: "active", session: { ...storedFixture(), revision: "not-uuid" } }),
    JSON.stringify({ kind: "active", session: { ...storedFixture(), createdAtMs: initialTime + 10_000 } }),
    JSON.stringify({ kind: "revoked", schemaVersion: 1, idHash: sessionHash, expiresAtMs: initialTime + 1000, extra: true }),
  ])("rejects malformed record case %# without deleting/overwriting it", async (raw) => {
    const h = redisHarness(); h.commands.get.mockResolvedValue(raw);
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "unavailable" });
    await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status: "unavailable" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("missing keys never upsert on update/revoke", async () => {
    const h = redisHarness();
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "missing" });
    await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status: "missing" });
    await expect(h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session))).resolves.toEqual({ status: "missing" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("checks expiry after GET resolves, not before the await", async () => {
    const h = redisHarness();
    h.commands.get.mockImplementation(async () => {
      h.setTime(h.session.expiresAtMs);
      return JSON.stringify({ kind: "active", session: h.session });
    });
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "expired" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("does not expire or refresh a BFF session solely because access token expired", async () => {
    const h = redisHarness(); h.found(); h.setTime(h.session.accessExpiresAtMs);
    expect((await h.store.read(sessionHash)).status).toBe("found");
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("tombstone blocks updates and is idempotently revoked", async () => {
    const h = redisHarness();
    h.commands.get.mockResolvedValue(JSON.stringify({ kind: "revoked", schemaVersion: 1, idHash: sessionHash, expiresAtMs: h.session.expiresAtMs }));
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "revoked" });
    await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status: "already-revoked" });
    await expect(h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session))).resolves.toEqual({ status: "revoked" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("rejects invalid hash/revision, lifetime and unexpected raw-token fields before I/O", async () => {
    const h = redisHarness();
    await expect(h.store.read("invalid")).resolves.toEqual({ status: "invalid-input" });
    await expect(h.store.revoke("invalid")).resolves.toEqual({ status: "invalid-input" });
    await expect(h.store.compareAndSet(sessionHash, "invalid", sessionValues(h.session))).resolves.toEqual({ status: "invalid-input" });
    await expect(h.store.create(newSession({ expiresAtMs: initialTime }))).resolves.toEqual({ status: "invalid-input" });
    const unexpected = { ...newSession(), refreshToken: "forbidden-fixture" };
    await expect(h.store.create(unexpected)).resolves.toEqual({ status: "invalid-input" });
    expect(h.commands.get).not.toHaveBeenCalled(); expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("handles bad clocks without writes", async () => {
    const h = redisHarness(); h.found(); h.setTime(NaN);
    await expect(h.store.create(newSession())).resolves.toEqual({ status: "unavailable" });
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "unavailable" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("stale revisions cannot write", async () => {
    const h = redisHarness(); h.found();
    await expect(h.store.compareAndSet(sessionHash, "0a0d3dd6-4c99-40c2-bb6b-a706dd89602a", sessionValues(h.session))).resolves.toEqual({ status: "conflict" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("redacts command errors and never retries uncertain mutations", async () => {
    const h = redisHarness(); h.found();
    h.commands.eval.mockRejectedValue(new Error("sensitive fixture connection details"));
    await expect(h.store.create(newSession())).resolves.toEqual({ status: "unavailable" });
    await expect(h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session))).resolves.toEqual({ status: "unavailable" });
    await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status: "unavailable" });
    expect(h.commands.eval).toHaveBeenCalledTimes(3);
    h.commands.get.mockRejectedValue(new Error("sensitive fixture details"));
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "unavailable" });
  });
  it.each(["", "with:colon", "*", "x".repeat(65), "unit\n"])("rejects namespace %j", (namespace) => {
    expect(() => createRedisSessionStore(redisHarness().commands, namespace)).toThrow("Invalid session store namespace");
  });
});
