import { randomUUID } from "node:crypto";
import type { SessionClock, SessionStore, SessionReadResult, StoredSession } from "@/server/auth/session-store";
import {
  hasValidSessionLifetime, newSessionSchema, readSessionClock,
  sessionIdHashSchema, sessionRevisionSchema, sessionValuesSchema,
} from "@/server/auth/session-store-validation";

type Entry = Readonly<{ expiresAtMs: number; session: StoredSession | null }>;

// Test support only. No runtime factory imports or selects this implementation.
export function createMemorySessionStoreForTests(now: SessionClock = Date.now): SessionStore {
  const entries = new Map<string, Entry>();

  function lookup(idHash: string, time: number): SessionReadResult {
    const entry = entries.get(idHash);
    if (!entry) return { status: "missing" };
    if (entry.expiresAtMs <= time) {
      entries.delete(idHash);
      return { status: "expired" };
    }
    return entry.session
      ? { status: "found", session: structuredClone(entry.session) }
      : { status: "revoked" };
  }

  function save(session: StoredSession): StoredSession {
    entries.set(session.idHash, { expiresAtMs: session.expiresAtMs, session: structuredClone(session) });
    return structuredClone(session);
  }

  return {
    async read(idHash) {
      if (!sessionIdHashSchema.safeParse(idHash).success) return { status: "invalid-input" };
      const time = readSessionClock(now);
      return time === undefined ? { status: "unavailable" } : lookup(idHash, time);
    },

    async create(input) {
      const parsed = newSessionSchema.safeParse(input);
      if (!parsed.success) return { status: "invalid-input" };
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      if (!hasValidSessionLifetime(parsed.data, time)) return { status: "invalid-input" };
      const existing = lookup(parsed.data.idHash, time);
      if (existing.status === "found" || existing.status === "revoked") return { status: "exists" };
      const session = save({ ...parsed.data, schemaVersion: 1, createdAtMs: time, revision: randomUUID() });
      return { status: "created", session };
    },

    async compareAndSet(idHash, expectedRevision, values) {
      const parsed = sessionValuesSchema.safeParse(values);
      if (!sessionIdHashSchema.safeParse(idHash).success
        || !sessionRevisionSchema.safeParse(expectedRevision).success || !parsed.success) {
        return { status: "invalid-input" };
      }
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      const current = lookup(idHash, time);
      if (current.status !== "found") return current;
      if (current.session.revision !== expectedRevision) return { status: "conflict" };
      if (!hasValidSessionLifetime(parsed.data, time)) return { status: "invalid-input" };
      const session = save({ ...current.session, ...parsed.data, revision: randomUUID() });
      return { status: "updated", session };
    },

    async revoke(idHash) {
      if (!sessionIdHashSchema.safeParse(idHash).success) return { status: "invalid-input" };
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      const current = lookup(idHash, time);
      if (current.status === "revoked") return { status: "already-revoked" };
      if (current.status !== "found") return current;
      // Tombstone retains the old expiry but discards even the protected token payload.
      entries.set(idHash, { expiresAtMs: current.session.expiresAtMs, session: null });
      return { status: "revoked" };
    },
  };
}
