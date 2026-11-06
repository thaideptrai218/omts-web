import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { NewSession, SessionStore } from "@/server/auth/session-store";
import { newSession, otherAccountId, sessionValues } from "@/server/auth/__tests__/session-fixture";

export function liveSessionInput(): NewSession {
  const now = Date.now();
  return newSession({ idHash: randomBytes(32).toString("hex"), accessExpiresAtMs: now + 1000,
    expiresAtMs: now + 60_000, refreshExpiresAtMs: now + 90_000 });
}

export async function requireCreated(store: SessionStore, input: NewSession) {
  const result = await store.create(input);
  if (result.status !== "created") throw new Error(`Expected created fixture, received ${result.status}`);
  return result.session;
}

// Shared observable contract; physical expiry and Redis failure/restart need separate tests.
export function registerSessionStoreContract(name: string, createStore: () => Promise<SessionStore>) {
  describe(name, () => {
    let store: SessionStore;
    let input: NewSession;
    beforeEach(async () => { store = await createStore(); input = liveSessionInput(); });

    it("round-trips explicit identity, lifetime and opaque revision", async () => {
      const session = await requireCreated(store, input);
      expect(session).toMatchObject({ ...input, schemaVersion: 1 });
      expect(session.revision).toMatch(/^[a-f0-9-]{36}$/);
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "found", session });
    });
    it.each(["password-change-required", "contact-verification-required", "application"] as const)(
      "stores phase %s without choosing a transition", async (phase) => {
        expect((await requireCreated(store, { ...input, phase })).phase).toBe(phase);
      },
    );
    it("duplicate creation never overwrites an active record", async () => {
      const session = await requireCreated(store, input);
      await expect(store.create({ ...input, phase: "application" })).resolves.toEqual({ status: "exists" });
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "found", session });
    });
    it("does not upsert missing keys through update or revoke", async () => {
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "missing" });
      await expect(store.compareAndSet(input.idHash, "122bb318-a72e-49aa-a8d7-a6169f889007", sessionValues(input)))
        .resolves.toEqual({ status: "missing" });
      await expect(store.revoke(input.idHash)).resolves.toEqual({ status: "missing" });
    });
    it("does not retain mutable input or return-value references", async () => {
      const original = structuredClone(input);
      const session = await requireCreated(store, input);
      Object.assign(input.identity, { accountId: otherAccountId });
      Object.assign(session.protectedTokens, { keyId: "changed" });
      const result = await store.read(input.idHash);
      expect(result).toMatchObject({ status: "found", session: original });
      if (result.status !== "found") throw new Error("Expected found fixture");
      Object.assign(result.session.identity, { accountId: otherAccountId });
      expect(await store.read(input.idHash)).toMatchObject({ status: "found", session: original });
    });
    it("isolates two sessions for one account and a different account", async () => {
      await requireCreated(store, input);
      const second = await requireCreated(store, liveSessionInput());
      const third = await requireCreated(store, { ...liveSessionInput(), identity: { ...input.identity, accountId: otherAccountId } });
      await store.revoke(input.idHash);
      await expect(store.read(second.idHash)).resolves.toEqual({ status: "found", session: second });
      await expect(store.read(third.idHash)).resolves.toEqual({ status: "found", session: third });
    });
    it("rejects malformed keys and unexpected credentials without creating a record", async () => {
      const extra = { ...input, accessToken: "forbidden-test-fixture" };
      await expect(store.create(extra)).resolves.toEqual({ status: "invalid-input" });
      await expect(store.read("malformed")).resolves.toEqual({ status: "invalid-input" });
      await expect(store.revoke("malformed")).resolves.toEqual({ status: "invalid-input" });
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "missing" });
    });
    it("updates mutable values while preserving identity and creation time", async () => {
      const session = await requireCreated(store, input);
      const updated = await store.compareAndSet(input.idHash, session.revision, sessionValues(session));
      expect(updated).toMatchObject({ status: "updated", session: { identity: session.identity, createdAtMs: session.createdAtMs } });
      if (updated.status !== "updated") throw new Error("Expected updated fixture");
      expect(updated.session.revision).not.toBe(session.revision);
      await expect(store.compareAndSet(input.idHash, session.revision, sessionValues(session))).resolves.toEqual({ status: "conflict" });
    });
    it("rejects extra identity/update fields and invalid lifetimes", async () => {
      const session = await requireCreated(store, input);
      const extra = { ...sessionValues(session), identity: { ...session.identity, accountId: otherAccountId } };
      for (const values of [extra, { ...sessionValues(session), expiresAtMs: 0 },
        { ...sessionValues(session), expiresAtMs: session.refreshExpiresAtMs + 1 }]) {
        await expect(store.compareAndSet(input.idHash, session.revision, values)).resolves.toEqual({ status: "invalid-input" });
      }
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "found", session });
    });
    it("allows only one of twenty updates against the same revision", async () => {
      const session = await requireCreated(store, input);
      const results = await Promise.all(Array.from({ length: 20 }, () => store.compareAndSet(input.idHash, session.revision, sessionValues(session))));
      expect(results.filter((r) => r.status === "updated")).toHaveLength(1);
      expect(results.filter((r) => r.status === "conflict")).toHaveLength(19);
    });
    it("revokes idempotently and blocks stale updates and recreation", async () => {
      const session = await requireCreated(store, input);
      await expect(store.revoke(input.idHash)).resolves.toEqual({ status: "revoked" });
      await expect(store.revoke(input.idHash)).resolves.toEqual({ status: "already-revoked" });
      await expect(store.read(input.idHash)).resolves.toEqual({ status: "revoked" });
      await expect(store.compareAndSet(input.idHash, session.revision, sessionValues(session))).resolves.toEqual({ status: "revoked" });
      await expect(store.create(input)).resolves.toEqual({ status: "exists" });
    });
  });
}
