import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { registerSessionStoreContract } from "@/server/auth/__tests__/session-store-contract";

const endpoint = process.env.OMTS_TEST_REDIS_URL;
type Connected = Extract<Awaited<ReturnType<typeof connectSessionRedis>>, { status: "connected" }>;

describe.skipIf(endpoint === undefined)("live Redis shared contract", () => {
  let connection: Connected["connection"] | undefined;
  beforeAll(async () => {
    const result = await connectSessionRedis({ url: endpoint ?? "", connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
    if (result.status !== "connected") throw new Error(`Live Redis setup failed: ${result.status}`);
    connection = result.connection;
  });
  afterAll(() => { connection?.close(); });
  registerSessionStoreContract("Redis implements the same observable contract", async () => {
    if (!connection) throw new Error("Live Redis connection unavailable");
    return createRedisSessionStore(connection.commands, `contract-${randomUUID()}`);
  });
});
