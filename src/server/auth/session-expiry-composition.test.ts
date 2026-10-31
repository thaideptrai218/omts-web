import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { checkAccessBoundExpiry, deriveAccessBoundExpiry } from "./session-expiry";
import { createMemorySessionStoreForTests } from "./__tests__/memory-session-store";
import { initialTime, newSession, sessionHash } from "./__tests__/session-fixture";
import type { SessionClock, SessionReadResult } from "./session-store";

const wire = {
  accessTokenExpiresAt: new Date(initialTime + 1000).toISOString(),
  refreshTokenExpiresAt: new Date(initialTime + 60_000).toISOString(),
};
// Test-only stage selection; not a product DAL, guard, factory or API adapter.
function assessRead(result: SessionReadResult, clock: SessionClock) {
  return result.status === "found" ? checkAccessBoundExpiry(result.session, clock) : result;
}

describe("C3A policy composition without runtime wiring", () => {
  it.each(["password-change-required", "contact-verification-required", "application"] as const)(
    "preserves phase %s while deriving a store-compatible bounded lifetime", async (phase) => {
      let now = initialTime;
      const clock = () => now;
      const derived = deriveAccessBoundExpiry(wire, clock);
      if (derived.status !== "active") throw new Error("Unexpected fake expiry rejection");
      const { status: temporalStatus, ...times } = derived;
      const store = createMemorySessionStoreForTests(clock);
      const result = await store.create(newSession({ ...times, phase }));
      expect(temporalStatus).toBe("active");
      expect(result.status).toBe("created");
      if (result.status !== "created") throw new Error("Unexpected fake store rejection");
      expect(result.session.phase).toBe(phase);
      const snapshot = structuredClone(result.session);
      for (const elapsed of [0, 400, 999]) {
        now = initialTime + elapsed;
        const read = await store.read(sessionHash);
        expect(assessRead(read, clock)).toMatchObject({ status: "active", expiresAtMs: initialTime + 1000 });
        expect(read.status === "found" && read.session).toEqual(snapshot);
      }
      now = initialTime + 1000;
      expect(assessRead(await store.read(sessionHash), clock)).toEqual({ status: "expired" });
      expect(await store.read(sessionHash)).toEqual({ status: "missing" });
    },
  );
  it("does not rebase a delayed response or repeated checks on the new clock time", () => {
    for (const elapsed of [0, 500, 999]) {
      const result = deriveAccessBoundExpiry(wire, () => initialTime + elapsed);
      expect(result).toMatchObject({ status: "active", expiresAtMs: initialTime + 1000 });
      expect(checkAccessBoundExpiry(result, () => initialTime + elapsed)).toEqual(result);
    }
    expect(deriveAccessBoundExpiry(wire, () => initialTime + 1000)).toEqual({ status: "expired" });
    expect(deriveAccessBoundExpiry(wire, () => initialTime + 60_001)).toEqual({ status: "expired" });
  });
  it("rechecks a found snapshot after a delay instead of reusing its earlier active verdict", async () => {
    let now = initialTime;
    const clock = () => now;
    const store = createMemorySessionStoreForTests(clock);
    expect((await store.create(newSession({ expiresAtMs: initialTime + 1000 }))).status).toBe("created");
    const snapshot = await store.read(sessionHash);
    expect(assessRead(snapshot, clock).status).toBe("active");
    now = initialTime + 1000;
    expect(assessRead(snapshot, clock)).toEqual({ status: "expired" });
  });
  it.each(["unavailable", "missing", "revoked", "expired", "invalid-input"] as const)(
    "preserves store outcome %s rather than treating every failure as expiry", (status) => {
      const clock = vi.fn(() => initialTime);
      expect(assessRead({ status }, clock)).toEqual({ status });
      expect(clock).not.toHaveBeenCalled();
    },
  );
  it("does not silently accept a generic refresh-bounded record as C3A-ready", async () => {
    const store = createMemorySessionStoreForTests(() => initialTime);
    // Historical store contract intentionally permits expires > access expiry.
    expect((await store.create(newSession())).status).toBe("created");
    const before = await store.read(sessionHash);
    expect(assessRead(before, () => initialTime)).toEqual({ status: "invalid-input" });
    expect(await store.read(sessionHash)).toEqual(before);
  });
  it("keeps infrastructure failure distinct and leaves the record unchanged", async () => {
    let broken = false;
    const clock = () => { if (broken) throw new Error("fake-clock-secret"); return initialTime; };
    const store = createMemorySessionStoreForTests(clock);
    const bounded = newSession({ expiresAtMs: initialTime + 1000 });
    expect((await store.create(bounded)).status).toBe("created");
    const before = await store.read(sessionHash);
    broken = true;
    expect(assessRead(await store.read(sessionHash), clock)).toEqual({ status: "unavailable" });
    broken = false;
    expect(await store.read(sessionHash)).toEqual(before);
  });
  it("does not emit credentials, write state, refresh, clear cookies or map MSG19", () => {
    const input = Object.freeze({ ...wire, accessToken: "fake-access-secret", refreshToken: "fake-refresh-secret", expiresAtMs: initialTime + 9_999_999 });
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const result = deriveAccessBoundExpiry(input, () => initialTime);
      expect(result).toEqual({ status: "active", accessExpiresAtMs: initialTime + 1000, refreshExpiresAtMs: initialTime + 60_000, expiresAtMs: initialTime + 1000 });
      expect(JSON.stringify(result)).not.toMatch(/secret|accessToken|refreshToken|MSG19/);
      expect(network).not.toHaveBeenCalled();
      const expired = deriveAccessBoundExpiry(input, () => initialTime + 1000);
      expect(expired).toEqual({ status: "expired" });
      expect(Object.isFrozen(expired)).toBe(true);
      expect(input.expiresAtMs).toBe(initialTime + 9_999_999);
    } finally { network.mockRestore(); }
  });
});
