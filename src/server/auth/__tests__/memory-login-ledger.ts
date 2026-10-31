import { randomBytes, randomUUID } from "node:crypto";
import type { SessionClock } from "../session-store";
import type { LoginAttempt, LoginLedger, LoginLedgerContext, LoginLedgerReadResult, LoginLedgerState, LoginLedgerWriteResult } from "../login-ledger";
import { readSessionClock, sessionIdHashSchema } from "../session-store-validation";
import { beginLedgerInput, invalidateLedgerInput, ledgerTimestamp, matchLedgerInput, parseLedgerInput, publishLedgerInput, settleLedgerInput } from "./login-ledger-validation";

// Reference model only: every command mutates one Map synchronously. Never a
// runtime fallback, Redis simulator, cookie bootstrap or backend session store.
export function createMemoryLoginLedgerFixture(clock: SessionClock) {
  const entries = new Map<string, LoginLedgerContext>();

  function update(context: LoginLedgerContext, state: LoginLedgerState, expiresAtMs = context.expiresAtMs): LoginLedgerWriteResult {
    if (context.generation >= Number.MAX_SAFE_INTEGER) return { status: "unavailable" };
    const next = { ...context, state: structuredClone(state), expiresAtMs,
      revision: randomUUID(), generation: context.generation + 1 };
    entries.set(context.contextHash, structuredClone(next));
    return { status: "updated", context: structuredClone(next) };
  }

  function lookup(contextHash: string, now: number): LoginLedgerReadResult {
    const context = entries.get(contextHash);
    if (!context) return { status: "missing" };
    if (context.expiresAtMs <= now) { entries.delete(contextHash); return { status: "expired" }; }
    const deadline = context.state.kind === "pending" ? context.state.pendingUntilMs
      : context.state.kind === "active" ? context.state.binding.expiresAtMs : undefined;
    if (deadline !== undefined && deadline <= now) {
      const result = update(context, { kind: "check-required" });
      return result.status === "updated" ? { status: "found", context: result.context } : { status: "unavailable" };
    }
    return { status: "found", context: structuredClone(context) };
  }

  function pending(attempt: LoginAttempt, now: number) {
    const result = lookup(attempt.contextHash, now);
    if (result.status !== "found") return result;
    const { context } = result;
    return context.state.kind === "pending" && context.state.attemptId === attempt.attemptId
      && context.generation === attempt.generation ? result : { status: "conflict" as const };
  }

  const store: LoginLedger = {
    async read(contextHash) {
      if (!sessionIdHashSchema.safeParse(contextHash).success) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      return now === undefined ? { status: "unavailable" } : lookup(contextHash, now);
    },
    async begin(input) {
      const parsed = parseLedgerInput(beginLedgerInput, input);
      if (!parsed) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" };
      if (parsed.pendingUntilMs <= now) return { status: "invalid-input" };
      const result = lookup(parsed.contextHash, now);
      if (result.status !== "found") return result;
      const { context } = result;
      if (context.revision !== parsed.expectedRevision) return { status: "conflict" };
      if (context.state.kind !== "idle") return { status: "blocked" };
      if (parsed.pendingUntilMs > context.expiresAtMs) return { status: "invalid-input" };
      const attemptId = randomUUID();
      const changed = update(context, { kind: "pending", attemptId, pendingUntilMs: parsed.pendingUntilMs });
      if (changed.status !== "updated") return changed;
      return { status: "started", context: changed.context,
        attempt: { contextHash: context.contextHash, generation: changed.context.generation, attemptId } };
    },
    async publish(input) {
      const parsed = parseLedgerInput(publishLedgerInput, input);
      if (!parsed) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" };
      if (parsed.binding.expiresAtMs <= now) return { status: "invalid-input" };
      const result = pending(parsed.attempt, now);
      if (result.status !== "found") return result;
      // Extend only ledger retention to cover the already-derived session life.
      // This never changes or refreshes the referenced session's own deadline.
      return update(result.context, { kind: "active", binding: parsed.binding },
        Math.max(result.context.expiresAtMs, parsed.binding.expiresAtMs));
    },
    async settle(input) {
      const parsed = parseLedgerInput(settleLedgerInput, input);
      if (!parsed) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" };
      const result = pending(parsed.attempt, now);
      if (result.status !== "found") return result;
      return update(result.context, { kind: parsed.outcome === "rejected" ? "idle" : "check-required" });
    },
    async invalidate(input) {
      const parsed = parseLedgerInput(invalidateLedgerInput, input);
      if (!parsed) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" };
      const result = lookup(parsed.contextHash, now);
      if (result.status !== "found") return result;
      if (result.context.revision !== parsed.expectedRevision) return { status: "conflict" };
      if (result.context.state.kind === "revoked") return { status: "blocked" };
      return update(result.context, { kind: "revoked" });
    },
    async matchBinding(input) {
      const parsed = parseLedgerInput(matchLedgerInput, input);
      if (!parsed) return { status: "invalid-input" };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" };
      const result = lookup(parsed.contextHash, now);
      if (result.status !== "found") return result;
      const state = result.context.state;
      return { status: state.kind === "active" && state.binding.sessionHash === parsed.sessionHash
        && state.binding.sessionRevision === parsed.sessionRevision ? "matched" : "not-matched" };
    },
  };

  return {
    store,
    // Fresh-context allocation for tests only. No API to recreate a caller's old
    // hash. Real bootstrap/cookie allocation is a separate, unimplemented slice.
    createFreshContext(expiresAtMs: number) {
      if (parseLedgerInput(ledgerTimestamp, expiresAtMs) === undefined) return { status: "invalid-input" as const };
      const now = readSessionClock(clock);
      if (now === undefined) return { status: "unavailable" as const };
      if (expiresAtMs <= now) return { status: "invalid-input" as const };
      const context: LoginLedgerContext = { contextHash: randomBytes(32).toString("hex"), revision: randomUUID(),
        generation: 0, createdAtMs: now, expiresAtMs, state: { kind: "idle" } };
      entries.set(context.contextHash, structuredClone(context));
      return { status: "created" as const, context: structuredClone(context) };
    },
  };
}
