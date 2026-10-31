import "server-only";
import { randomUUID } from "node:crypto";
import type { SessionClock, SessionReadResult, SessionStore, StoredSession } from "@/server/auth/session-store";
import type { SessionRedisCommands } from "@/server/auth/session-redis-client";
import { decodeSessionRecord, encodeSessionRecord } from "@/server/auth/session-redis-record";
import { createSessionScript, replaceSessionScript } from "@/server/auth/session-redis-scripts";
import {
  hasValidSessionLifetime, newSessionSchema, readSessionClock,
  sessionIdHashSchema, sessionRevisionSchema, sessionValuesSchema,
} from "@/server/auth/session-store-validation";

type Lookup = Exclude<SessionReadResult, { status: "found" }>
  | { status: "found"; session: StoredSession; raw: string };

export function createRedisSessionStore(
  commands: SessionRedisCommands, namespace: string, now: SessionClock = Date.now,
): SessionStore {
  if (typeof namespace !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(namespace)) {
    throw new Error("Invalid session store namespace");
  }
  const key = (idHash: string) => `omts:bff:v1:${namespace}:${idHash}`;

  async function lookup(idHash: string): Promise<Lookup> {
    try {
      const raw = await commands.get(key(idHash));
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      // Redis TTL eviction cannot distinguish never-created from expired keys.
      if (raw === null) return { status: "missing" };
      const record = decodeSessionRecord(raw, idHash);
      if (!record || typeof raw !== "string") return { status: "unavailable" };
      const expiry = record.kind === "active" ? record.session.expiresAtMs : record.expiresAtMs;
      if (expiry <= time) return { status: "expired" };
      return record.kind === "revoked" ? { status: "revoked" }
        : { status: "found", session: record.session, raw };
    } catch { return { status: "unavailable" }; }
  }

  async function write(script: string, idHash: string, raw: string, expiry: number, expected?: string) {
    try {
      return await commands.eval(script, {
        keys: [key(idHash)], arguments: [raw, String(expiry), ...(expected === undefined ? [] : [expected])],
      });
    } catch {
      // A timeout may mean the write applied but its reply was lost. Never replay it here.
      return undefined;
    }
  }

  return {
    async read(idHash) {
      if (!sessionIdHashSchema.safeParse(idHash).success) return { status: "invalid-input" };
      const current = await lookup(idHash);
      return current.status === "found" ? { status: "found", session: current.session } : current;
    },
    async create(input) {
      const parsed = newSessionSchema.safeParse(input);
      if (!parsed.success) return { status: "invalid-input" };
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      if (!hasValidSessionLifetime(parsed.data, time)) return { status: "invalid-input" };
      try {
        const session: StoredSession = { ...parsed.data, schemaVersion: 1, createdAtMs: time, revision: randomUUID() };
        const raw = encodeSessionRecord({ kind: "active", session });
        if (!raw) return { status: "invalid-input" };
        const result = await write(createSessionScript, session.idHash, raw, session.expiresAtMs);
        if (result === "stored") return { status: "created", session };
        if (result === "exists") return { status: "exists" };
        return { status: result === "expired" ? "invalid-input" : "unavailable" };
      } catch { return { status: "unavailable" }; }
    },
    async compareAndSet(idHash, expectedRevision, values) {
      const parsed = sessionValuesSchema.safeParse(values);
      if (!parsed.success || !sessionIdHashSchema.safeParse(idHash).success
        || !sessionRevisionSchema.safeParse(expectedRevision).success) return { status: "invalid-input" };
      const current = await lookup(idHash);
      if (current.status !== "found") return current;
      if (current.session.revision !== expectedRevision) return { status: "conflict" };
      const time = readSessionClock(now);
      if (time === undefined) return { status: "unavailable" };
      if (!hasValidSessionLifetime(parsed.data, time)) return { status: "invalid-input" };
      try {
        const session = { ...current.session, ...parsed.data, revision: randomUUID() };
        const raw = encodeSessionRecord({ kind: "active", session });
        if (!raw) return { status: "invalid-input" };
        const result = await write(replaceSessionScript, idHash, raw, session.expiresAtMs, current.raw);
        if (result === "stored") return { status: "updated", session };
        if (result === "changed") return { status: "conflict" };
        if (result === "missing" || result === "expired") return { status: result };
        return { status: "unavailable" };
      } catch { return { status: "unavailable" }; }
    },
    async revoke(idHash) {
      if (!sessionIdHashSchema.safeParse(idHash).success) return { status: "invalid-input" };
      const current = await lookup(idHash);
      if (current.status === "revoked") return { status: "already-revoked" };
      if (current.status !== "found") return current;
      const raw = encodeSessionRecord({
        kind: "revoked", schemaVersion: 1, idHash, expiresAtMs: current.session.expiresAtMs,
      });
      if (!raw) return { status: "unavailable" };
      const result = await write(replaceSessionScript, idHash, raw, current.session.expiresAtMs, current.raw);
      if (result === "stored") return { status: "revoked" };
      if (result === "missing" || result === "expired") return { status: result };
      // Changed snapshot is NOT a confirmed revoke. Caller must not claim success.
      return { status: "unavailable" };
    },
  };
}
