import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  accountId, createSessionHarness, initialTime, newSession,
  otherAccountId, otherSessionHash, sessionHash,
} from "@/server/auth/__tests__/session-fixture";

describe("BFF session store lifecycle (RAM test adapter, not Redis)", () => {
  it("creates and reads explicit metadata without inventing a lifetime", async () => {
    const harness = createSessionHarness();
    const session = await harness.create();
    expect(session).toMatchObject({ ...newSession(), schemaVersion: 1, createdAtMs: initialTime });
    expect(session.revision).toMatch(/^[a-f0-9-]{36}$/);
    await expect(harness.store.read(sessionHash)).resolves.toEqual({ status: "found", session });
  });

  it.each(["password-change-required", "contact-verification-required", "application"] as const)(
    "stores phase %s without deciding business transitions", async (phase) => {
      const harness = createSessionHarness();
      expect((await harness.create(newSession({ phase }))).phase).toBe(phase);
    },
  );

  it("does not overwrite an existing session on create", async () => {
    const { store, create } = createSessionHarness();
    const first = await create();
    await expect(store.create(newSession({ phase: "application" }))).resolves.toEqual({ status: "exists" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session: first });
  });

  it("isolates accounts and multiple sessions of the same account", async () => {
    const { store, create } = createSessionHarness();
    const first = await create();
    const second = await create(newSession({ idHash: otherSessionHash }));
    expect(second.identity.accountId).toBe(accountId);
    await store.revoke(sessionHash);
    await expect(store.read(otherSessionHash)).resolves.toEqual({ status: "found", session: second });
    const third = await create(newSession({
      idHash: "c".repeat(64), identity: { ...first.identity, accountId: otherAccountId },
    }));
    expect(third.identity.accountId).toBe(otherAccountId);
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "revoked" });
  });

  it("keeps input, create result and read snapshots separate from stored data", async () => {
    const { store, create } = createSessionHarness();
    const input = structuredClone(newSession());
    const session = await create(input);
    Object.assign(input.identity, { accountId: otherAccountId });
    Object.assign(session.protectedTokens, { sealed: "B".repeat(64) });
    const first = await store.read(sessionHash);
    if (first.status !== "found") throw new Error("Expected test session");
    expect(first.session.identity.accountId).toBe(accountId);
    expect(first.session.protectedTokens.sealed).toBe("A".repeat(64));
    Object.assign(first.session.identity, { accountId: otherAccountId });
    await expect(store.read(sessionHash)).resolves.toMatchObject({ session: { identity: { accountId } } });
  });

  it("does not share memory between separate test adapter instances", async () => {
    await createSessionHarness().create();
    await expect(createSessionHarness().store.read(sessionHash)).resolves.toEqual({ status: "missing" });
  });
});
