import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { NewSession } from "@/server/auth/session-store";
import {
  createSessionHarness, newSession, otherAccountId, sessionHash, sessionValues,
} from "@/server/auth/__tests__/session-fixture";

describe("BFF session runtime contract validation", () => {
  it.each([
    { idHash: "raw-browser-sid" }, { idHash: "A".repeat(64) }, { idHash: `${sessionHash}\n` },
    { identity: { ...newSession().identity, accountId: "bad" } },
    { identity: { ...newSession().identity, subjectType: "FutureActor" } },
    { identity: { ...newSession().identity, displayName: "unexpected" } },
    { phase: "authenticated-by-role-name" },
    { protectedTokens: { keyId: "test", sealed: "plaintext" } },
    { protectedTokens: { keyId: "test", sealed: "A".repeat(16_385) } },
    { protectedTokens: { keyId: "", sealed: "A".repeat(64) } },
    { protectedTokens: { keyId: "test\n", sealed: "A".repeat(64) } },
    { protectedTokens: { keyId: "test", sealed: `${"A".repeat(64)}\n` } },
    { accessExpiresAtMs: NaN }, { refreshExpiresAtMs: Infinity },
    { expiresAtMs: 0.5 }, { expiresAtMs: 8_640_000_000_000_001 },
    { accessToken: "fixture-only-do-not-persist" },
    { refreshToken: "fixture-only-do-not-persist" },
    { password: "fixture-only-do-not-persist" },
    { schemaVersion: 2 }, { revision: "caller-controlled" },
  ])("rejects invalid/extra create fields without writing or echoing them: %j", async (change) => {
    const { store } = createSessionHarness();
    const input = { ...newSession(), ...change } as NewSession;
    await expect(store.create(input)).resolves.toEqual({ status: "invalid-input" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "missing" });
  });

  it.each(["", "raw-sid", "f".repeat(63), "F".repeat(64)])("rejects malformed lookup key %s", async (idHash) => {
    const { store } = createSessionHarness();
    await expect(store.read(idHash)).resolves.toEqual({ status: "invalid-input" });
    await expect(store.revoke(idHash)).resolves.toEqual({ status: "invalid-input" });
  });

  it("does not allow identity changes or extra credential fields through an update", async () => {
    const { store, create } = createSessionHarness();
    const session = await create();
    for (const extra of [
      { identity: { ...session.identity, accountId: otherAccountId } },
      { idHash: "b".repeat(64) }, { createdAtMs: 0 }, { accessToken: "fixture-only" },
    ]) {
      await expect(store.compareAndSet(sessionHash, session.revision, { ...sessionValues(session), ...extra }))
        .resolves.toEqual({ status: "invalid-input" });
    }
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session });
  });

  it("rejects an invalid revision or invalid update lifetime without changing the record", async () => {
    const { store, create } = createSessionHarness();
    const session = await create();
    await expect(store.compareAndSet(sessionHash, "not-a-revision", sessionValues(session)))
      .resolves.toEqual({ status: "invalid-input" });
    await expect(store.compareAndSet(sessionHash, session.revision, {
      ...sessionValues(session), expiresAtMs: session.refreshExpiresAtMs + 1,
    })).resolves.toEqual({ status: "invalid-input" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session });
  });
});
