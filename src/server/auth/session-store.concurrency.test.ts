import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  createSessionHarness, initialTime, newSession, sessionHash, sessionValues,
} from "@/server/auth/__tests__/session-fixture";

describe("BFF session conditional writes and revocation", () => {
  it("updates only mutable fields and replaces the opaque revision", async () => {
    const { store, create, setTime } = createSessionHarness();
    const before = await create();
    setTime(initialTime + 100);
    const result = await store.compareAndSet(sessionHash, before.revision, {
      ...sessionValues(before), phase: "application",
    });
    expect(result).toMatchObject({ status: "updated", session: {
      identity: before.identity, createdAtMs: before.createdAtMs, phase: "application",
    } });
    if (result.status === "updated") expect(result.session.revision).not.toBe(before.revision);
  });

  it("accepts only one writer using the same revision", async () => {
    const { store, create } = createSessionHarness();
    const before = await create();
    const results = await Promise.all([
      store.compareAndSet(sessionHash, before.revision, sessionValues(before)),
      store.compareAndSet(sessionHash, before.revision, { ...sessionValues(before), phase: "application" }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["conflict", "updated"]);
    // This exercises one synchronous Map, not Redis/multi-process atomicity.
  });

  it("does not let a stale response revive a revoked session", async () => {
    const { store, create } = createSessionHarness();
    const before = await create();
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "revoked" });
    await expect(store.compareAndSet(sessionHash, before.revision, sessionValues(before)))
      .resolves.toEqual({ status: "revoked" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "revoked" });
  });

  it("revokes idempotently without returning tokens or allowing recreate before expiry", async () => {
    const { store, create } = createSessionHarness();
    await create();
    await store.revoke(sessionHash);
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "already-revoked" });
    await expect(store.create(newSession())).resolves.toEqual({ status: "exists" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "revoked" });
  });

  it("never upserts a missing session on update or revoke", async () => {
    const { store } = createSessionHarness();
    await expect(store.compareAndSet(sessionHash, "122bb318-a72e-49aa-a8d7-a6169f889007", sessionValues(newSession())))
      .resolves.toEqual({ status: "missing" });
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "missing" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "missing" });
  });

  it("rejects an old revision even after expiry and re-creation of the same lookup key", async () => {
    const { store, create, setTime } = createSessionHarness();
    const old = await create();
    setTime(old.expiresAtMs);
    const next = await create(newSession({ expiresAtMs: old.expiresAtMs + 1000 }));
    expect(next.revision).not.toBe(old.revision);
    await expect(store.compareAndSet(sessionHash, old.revision, sessionValues(next)))
      .resolves.toEqual({ status: "conflict" });
  });
});
