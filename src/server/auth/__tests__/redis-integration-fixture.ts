import { randomUUID } from "node:crypto";
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { liveSessionInput, requireCreated } from "@/server/auth/__tests__/session-store-contract";

type Connected = Extract<Awaited<ReturnType<typeof connectSessionRedis>>, { status: "connected" }>;

export async function createRedisIntegrationFixture(endpoint: string) {
  const namespace = `edge-${randomUUID()}`;
  const connections: Connected["connection"][] = [];
  try {
    for (let index = 0; index < 2; index++) {
      const result = await connectSessionRedis({ url: endpoint, connectTimeoutMs: 2500, commandTimeoutMs: 2500 });
      if (result.status !== "connected") throw new Error(`Live Redis setup failed: ${result.status}`);
      connections.push(result.connection);
    }
    const first = createRedisSessionStore(connections[0].commands, namespace);
    const second = createRedisSessionStore(connections[1].commands, namespace);
    return {
      first, second, namespace, commands: connections[0].commands,
      key: (hash: string) => `omts:bff:v1:${namespace}:${hash}`,
      create: () => requireCreated(first, liveSessionInput()),
      close() { for (const connection of connections) connection.close(); },
    };
  } catch (error) {
    for (const connection of connections) connection.close();
    throw error;
  }
}
