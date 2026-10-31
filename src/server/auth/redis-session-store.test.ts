import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { redisHarness } from "@/server/auth/__tests__/redis-session-fixture";
import { initialTime, newSession, sessionHash, sessionValues } from "@/server/auth/__tests__/session-fixture";
import { createSessionScript, replaceSessionScript } from "@/server/auth/session-redis-scripts";

describe("Redis adapter command boundary (not live Redis)", () => {
  it("creates only an opaque record, with one namespaced key and absolute expiry", async () => {
    const h = redisHarness();
    const result = await h.store.create(newSession());
    expect(result.status).toBe("created");
    expect(h.commands.get).not.toHaveBeenCalled();
    expect(h.commands.eval).toHaveBeenCalledWith(createSessionScript, {
      keys: [`omts:bff:v1:unit:${sessionHash}`],
      arguments: [expect.any(String), String(initialTime + 10_000)],
    });
    expect(h.written()).toMatchObject({ kind: "active", session: { schemaVersion: 1, identity: h.session.identity } });
    expect(Object.keys(h.written().session.protectedTokens)).toEqual(["keyId", "sealed"]);
  });
  it.each([["exists", "exists"], ["expired", "invalid-input"], [null, "unavailable"], ["surprise", "unavailable"]])(
    "maps create reply %j to %s", async (reply, status) => {
      const h = redisHarness(); h.commands.eval.mockResolvedValue(reply);
      await expect(h.store.create(newSession())).resolves.toEqual({ status });
    },
  );
  it("reads validated snapshots without exposing raw storage JSON", async () => {
    const h = redisHarness(); h.found();
    const result = await h.store.read(sessionHash);
    expect(result).toEqual({ status: "found", session: h.session });
    if (result.status !== "found") throw new Error("Expected found fixture");
    Object.assign(result.session.identity, { accountId: "changed" });
    await expect(h.store.read(sessionHash)).resolves.toEqual({ status: "found", session: h.session });
  });
  it("preserves identity/createdAt and replaces revision using exact validated bytes", async () => {
    const h = redisHarness(); h.found();
    const result = await h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session));
    if (result.status !== "updated") throw new Error("Expected updated fixture");
    expect(result.session.identity).toEqual(h.session.identity);
    expect(result.session.createdAtMs).toBe(h.session.createdAtMs);
    expect(result.session.revision).not.toBe(h.session.revision);
    expect(h.commands.eval).toHaveBeenCalledWith(replaceSessionScript, {
      keys: [`omts:bff:v1:unit:${sessionHash}`],
      arguments: [expect.any(String), String(h.session.expiresAtMs), JSON.stringify({ kind: "active", session: h.session })],
    });
  });
  it.each([["changed", "conflict"], ["missing", "missing"], ["expired", "expired"], ["unexpected", "unavailable"]])(
    "maps conditional update %s to %s without retry", async (reply, status) => {
      const h = redisHarness(); h.found(); h.commands.eval.mockResolvedValue(reply);
      await expect(h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session))).resolves.toEqual({ status });
      expect(h.commands.eval).toHaveBeenCalledTimes(1);
    },
  );
  it("revoke discards identity/tokens and retains expiry", async () => {
    const h = redisHarness(); h.found();
    await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status: "revoked" });
    expect(h.written()).toEqual({ kind: "revoked", schemaVersion: 1, idHash: sessionHash, expiresAtMs: h.session.expiresAtMs });
    expect(h.commands.eval.mock.calls[0][1].arguments[2]).toBe(JSON.stringify({ kind: "active", session: h.session }));
  });
  it.each([["changed", "unavailable"], ["missing", "missing"], ["expired", "expired"], ["surprise", "unavailable"]])(
    "does not falsely acknowledge revoke on %s", async (reply, status) => {
      const h = redisHarness(); h.found(); h.commands.eval.mockResolvedValue(reply);
      await expect(h.store.revoke(sessionHash)).resolves.toEqual({ status });
      expect(h.commands.eval).toHaveBeenCalledTimes(1);
    },
  );
});
