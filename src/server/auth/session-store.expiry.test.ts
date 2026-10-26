import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createMemorySessionStoreForTests } from "@/server/auth/__tests__/memory-session-store";
import {
  createSessionHarness, initialTime, newSession, sessionHash, sessionValues,
} from "@/server/auth/__tests__/session-fixture";

describe("BFF session expiry and unavailable dependency", () => {
  it("expires at the exact caller-provided boundary, without sliding on read", async () => {
    const { store, create, setTime } = createSessionHarness();
    const session = await create();
    setTime(session.expiresAtMs - 1);
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session });
    setTime(session.expiresAtMs);
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "expired" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "missing" });
  });

  it("does not use access-token expiry alone to delete a stored session or run refresh", async () => {
    const { store, create, setTime } = createSessionHarness();
    const session = await create();
    setTime(session.accessExpiresAtMs);
    // Store presence is not permission to call the API with an expired access token.
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session });
  });

  it("refuses a late update even when it requests a later expiry", async () => {
    const { store, create, setTime } = createSessionHarness();
    const session = await create();
    setTime(session.expiresAtMs);
    await expect(store.compareAndSet(sessionHash, session.revision, {
      ...sessionValues(session), expiresAtMs: session.expiresAtMs + 1000,
    })).resolves.toEqual({ status: "expired" });
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "missing" });
  });

  it("expires tombstones at the original boundary without extending their lifetime", async () => {
    const { store, create, setTime } = createSessionHarness();
    const session = await create();
    await store.revoke(sessionHash);
    setTime(session.expiresAtMs - 1);
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "already-revoked" });
    setTime(session.expiresAtMs);
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "expired" });
  });

  it.each([initialTime, initialTime - 1, initialTime + 60_001])(
    "rejects an expired or backend-unbounded lifetime: %i", async (expiresAtMs) => {
      const { store } = createSessionHarness();
      await expect(store.create(newSession({ expiresAtMs }))).resolves.toEqual({ status: "invalid-input" });
      await expect(store.read(sessionHash)).resolves.toEqual({ status: "missing" });
    },
  );

  it.each([NaN, Infinity, -1, 0.5])("does not turn invalid clock %s into a missing session", async (time) => {
    const store = createMemorySessionStoreForTests(() => time);
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "unavailable" });
    await expect(store.create(newSession())).resolves.toEqual({ status: "unavailable" });
    await expect(store.revoke(sessionHash)).resolves.toEqual({ status: "unavailable" });
  });

  it("keeps data unchanged when the clock throws instead of falling back", async () => {
    let unavailable = false;
    const store = createMemorySessionStoreForTests(() => {
      if (unavailable) throw new Error("private dependency failure");
      return initialTime;
    });
    const result = await store.create(newSession());
    if (result.status !== "created") throw new Error("Expected created session");
    unavailable = true;
    await expect(store.compareAndSet(sessionHash, result.session.revision, sessionValues(result.session)))
      .resolves.toEqual({ status: "unavailable" });
    unavailable = false;
    await expect(store.read(sessionHash)).resolves.toEqual({ status: "found", session: result.session });
  });
});
