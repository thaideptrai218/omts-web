import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createMemoryLoginLedgerFixture } from "./__tests__/memory-login-ledger";
import { initialTime } from "./__tests__/session-fixture";

function harness() {
  let now = initialTime;
  const fixture = createMemoryLoginLedgerFixture(() => now);
  const created = fixture.createFreshContext(now + 10_000);
  if (created.status !== "created") throw new Error("Expected context");
  const context = created.context;
  const begin = () => fixture.store.begin({ contextHash: context.contextHash, expectedRevision: context.revision, pendingUntilMs: now + 1000 });
  return { ...fixture, context, begin, setTime(value: number) { now = value; } };
}
const binding = () => ({ sessionHash: "a".repeat(64), sessionRevision: randomUUID(), expiresAtMs: initialTime + 60_000 });

describe("G1 ledger reference model; not Redis or cookie acceptance", () => {
  it("lets only one of twenty callers reserve the same revision", async () => {
    const h = harness();
    const results = await Promise.all(Array.from({ length: 20 }, h.begin));
    expect(results.filter((result) => result.status === "started")).toHaveLength(1);
    expect(results.filter((result) => result.status === "conflict")).toHaveLength(19);
  });
  it.each(["unknown", "rejected"] as const)("settles a known %s outcome without automatically retrying", async (outcome) => {
    const h = harness(); const started = await h.begin();
    if (started.status !== "started") throw new Error("Expected attempt");
    const settled = await h.store.settle({ attempt: started.attempt, outcome });
    expect(settled).toMatchObject({ status: "updated", context: { state: { kind: outcome === "unknown" ? "check-required" : "idle" } } });
    expect(await h.store.publish({ attempt: started.attempt, binding: binding() })).toEqual({ status: "conflict" });
  });
  it("does not reopen an expired lease for another login", async () => {
    const h = harness(); const started = await h.begin();
    if (started.status !== "started") throw new Error("Expected attempt");
    h.setTime(initialTime + 1000);
    const current = await h.store.read(h.context.contextHash);
    if (current.status !== "found") throw new Error("Expected context");
    expect(current.context.state.kind).toBe("check-required");
    expect(await h.store.begin({ contextHash: h.context.contextHash, expectedRevision: current.context.revision, pendingUntilMs: initialTime + 2000 })).toEqual({ status: "blocked" });
    expect(await h.store.publish({ attempt: started.attempt, binding: binding() })).toEqual({ status: "conflict" });
  });
  it("matches only the published SID/revision and retains the ledger through C3A", async () => {
    const h = harness(); const started = await h.begin(); const candidate = binding();
    if (started.status !== "started") throw new Error("Expected attempt");
    expect((await h.store.publish({ attempt: started.attempt, binding: candidate })).status).toBe("updated");
    h.setTime(initialTime + 20_000);
    expect(await h.store.matchBinding({ contextHash: h.context.contextHash, ...candidate })).toEqual({ status: "invalid-input" });
    const match = { contextHash: h.context.contextHash, sessionHash: candidate.sessionHash, sessionRevision: candidate.sessionRevision };
    expect(await h.store.matchBinding(match)).toEqual({ status: "matched" });
    expect(await h.store.matchBinding({ ...match, sessionHash: "b".repeat(64) })).toEqual({ status: "not-matched" });
    h.setTime(candidate.expiresAtMs);
    expect((await h.store.matchBinding(match)).status).toBe("expired");
  });
  it("blocks late publication after invalidation and never upserts a lost context", async () => {
    const h = harness(); const started = await h.begin();
    if (started.status !== "started") throw new Error("Expected attempt");
    await h.store.invalidate({ contextHash: h.context.contextHash, expectedRevision: started.context.revision });
    expect(await h.store.publish({ attempt: started.attempt, binding: binding() })).toEqual({ status: "conflict" });
    const restarted = createMemoryLoginLedgerFixture(() => initialTime);
    expect(await restarted.store.publish({ attempt: started.attempt, binding: binding() })).toEqual({ status: "missing" });
    const fresh = restarted.createFreshContext(initialTime + 10_000);
    if (fresh.status !== "created") throw new Error("Expected fresh context");
    expect(fresh.context.contextHash).not.toBe(h.context.contextHash);
  });
  it("checks both attempt ID and generation after a new attempt starts", async () => {
    const h = harness(); const old = await h.begin();
    if (old.status !== "started") throw new Error("Expected attempt");
    const rejected = await h.store.settle({ attempt: old.attempt, outcome: "rejected" });
    if (rejected.status !== "updated") throw new Error("Expected settlement");
    const next = await h.store.begin({ contextHash: h.context.contextHash, expectedRevision: rejected.context.revision,
      pendingUntilMs: initialTime + 1000 });
    if (next.status !== "started") throw new Error("Expected next attempt");
    for (const attempt of [{ ...old.attempt, generation: next.attempt.generation }, { ...old.attempt, attemptId: next.attempt.attemptId }]) {
      expect(await h.store.publish({ attempt, binding: binding() })).toEqual({ status: "conflict" });
    }
    expect((await h.store.publish({ attempt: next.attempt, binding: binding() })).status).toBe("updated");
  });
  it("fails closed on an invalid clock without changing stored state", async () => {
    const h = harness(); h.setTime(Number.NaN);
    expect(await h.store.read(h.context.contextHash)).toEqual({ status: "unavailable" });
    h.setTime(initialTime);
    expect(await h.store.read(h.context.contextHash)).toEqual({ status: "found", context: h.context });
  });
  it("keeps returned snapshots separate from ledger state", async () => {
    const h = harness();
    Reflect.set(h.context, "generation", 100);
    const current = await h.store.read(h.context.contextHash);
    expect(current).toMatchObject({ context: { generation: 0 } });
  });
});
