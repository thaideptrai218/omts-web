import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { connectSessionRedis } from "./session-redis-client";
import { createRedisLoginLedger } from "./redis-login-ledger";

const endpoint = process.env.OMTS_TEST_REDIS_URL;
describe.skipIf(!endpoint)("G1 live Redis coordination across independent workers", () => {
  const connections: Extract<Awaited<ReturnType<typeof connectSessionRedis>>, { status: "connected" }>["connection"][] = [];
  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const result = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
      if (result.status !== "connected") throw new Error("Redis fixture unavailable");
      connections.push(result.connection);
    }
  });
  afterAll(() => connections.forEach((connection) => connection.close()));
  it("reserves one attempt across workers, blocks old publication and matches only the current binding", async () => {
    const namespace = `g1-${randomUUID()}`;
    const workers = connections.map((connection) => createRedisLoginLedger(connection.commands, namespace));
    const hash = randomBytes(32).toString("hex");
    const created = await workers[0].create(hash, Date.now() + 60_000);
    if (created.status !== "created") throw new Error("Context fixture not created");
    const reservations = await Promise.all(Array.from({ length: 20 }, (_, i) => workers[i % 2].begin({
      contextHash: hash, expectedRevision: created.context.revision, pendingUntilMs: Date.now() + 20_000,
    })));
    expect(reservations.filter((result) => result.status === "started")).toHaveLength(1);
    const started = reservations.find((result) => result.status === "started");
    if (started?.status !== "started") throw new Error("Attempt fixture not started");
    const binding = { sessionHash: randomBytes(32).toString("hex"), sessionRevision: randomUUID(), expiresAtMs: Date.now() + 120_000 };
    const published = await workers[0].publish({ attempt: started.attempt, binding });
    expect(published.status).toBe("updated");
    expect(await workers[1].matchBinding({ contextHash: hash, sessionHash: binding.sessionHash, sessionRevision: binding.sessionRevision })).toEqual({ status: "matched" });
    if (published.status !== "updated") throw new Error("Binding fixture not published");
    expect(published.context.expiresAtMs).toBe(binding.expiresAtMs);
    await workers[1].invalidate({ contextHash: hash, expectedRevision: published.context.revision });
    expect(await workers[0].publish({ attempt: started.attempt, binding })).toEqual({ status: "conflict" });
    expect(await workers[0].matchBinding({ contextHash: hash, sessionHash: binding.sessionHash, sessionRevision: binding.sessionRevision })).toEqual({ status: "not-matched" });
  });
  it("never recreates a missing context or automatically reopens an unknown outcome", async () => {
    const ledger = createRedisLoginLedger(connections[0].commands, `g1-${randomUUID()}`);
    const hash = randomBytes(32).toString("hex");
    expect(await ledger.read(hash)).toEqual({ status: "missing" });
    const created = await ledger.create(hash, Date.now() + 60_000);
    if (created.status !== "created") throw new Error("Context not created");
    const started = await ledger.begin({ contextHash: hash, expectedRevision: created.context.revision, pendingUntilMs: Date.now() + 20_000 });
    if (started.status !== "started") throw new Error("Attempt not started");
    const settled = await ledger.settle({ attempt: started.attempt, outcome: "unknown" });
    if (settled.status !== "updated") throw new Error("Attempt not settled");
    expect(await ledger.begin({ contextHash: hash, expectedRevision: settled.context.revision, pendingUntilMs: Date.now() + 20_000 })).toEqual({ status: "blocked" });
  });
});
