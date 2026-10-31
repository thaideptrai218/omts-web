import type { NewSession, SessionValues, StoredSession } from "@/server/auth/session-store";
import { createMemorySessionStoreForTests } from "@/server/auth/__tests__/memory-session-store";

export const sessionHash = "a".repeat(64);
export const otherSessionHash = "b".repeat(64);
export const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007";
export const otherAccountId = "222bb318-a72e-49aa-a8d7-a6169f889007";
export const initialTime = Date.UTC(2026, 9, 24, 8);

export function newSession(change: Partial<NewSession> = {}): NewSession {
  return {
    idHash: sessionHash,
    identity: { accountId, backendSessionId: accountId, subjectType: "Staff" },
    phase: "password-change-required",
    // Format-only stand-in, not ciphertext produced by an implemented token protector.
    protectedTokens: { keyId: "test-key", sealed: "A".repeat(64) },
    accessExpiresAtMs: initialTime + 1000,
    refreshExpiresAtMs: initialTime + 60_000,
    expiresAtMs: initialTime + 10_000,
    ...change,
  };
}

export function sessionValues(session: NewSession | StoredSession): SessionValues {
  return {
    phase: session.phase, protectedTokens: session.protectedTokens,
    accessExpiresAtMs: session.accessExpiresAtMs,
    refreshExpiresAtMs: session.refreshExpiresAtMs, expiresAtMs: session.expiresAtMs,
  };
}

export function createSessionHarness() {
  let time = initialTime;
  const store = createMemorySessionStoreForTests(() => time);
  return {
    store,
    setTime(value: number) { time = value; },
    async create(input = newSession()) {
      const result = await store.create(input);
      if (result.status !== "created") throw new Error("Expected a created test session");
      return result.session;
    },
  };
}
