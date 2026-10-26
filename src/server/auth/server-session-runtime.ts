import "server-only";

import { guardApplicationSession, type ApplicationSessionGuardResult } from "./application-session-guard";
import { createRedisSessionStore } from "./redis-session-store";
import { createServerSessionResolver, type ServerSessionResolution } from "./server-session-resolver";
import { parseServerSessionRuntimeConfig } from "./server-session-runtime-config";
import { readSessionCookie } from "./session-cookie-reader";
import { connectSessionRedis } from "./session-redis-client";
import type { SessionClock } from "./session-store";
import { createSessionTokenProtector } from "./session-token-protector";

type RuntimeDependencies = Readonly<{
  connectRedis: typeof connectSessionRedis;
  createStore: typeof createRedisSessionStore;
  createProtector: typeof createSessionTokenProtector;
  clock: SessionClock;
}>;

const defaultDependencies: RuntimeDependencies = Object.freeze({
  connectRedis: connectSessionRedis,
  createStore: createRedisSessionStore,
  createProtector: createSessionTokenProtector,
  clock: Date.now,
});

export type ServerSessionReadRuntime = Readonly<{
  resolve(cookieHeader: unknown): Promise<ServerSessionResolution>;
  resolveApplication(cookieHeader: unknown): Promise<ApplicationSessionGuardResult>;
  close(): void;
}>;

export type ServerSessionRuntimeOpenResult =
  | Readonly<{ status: "ready"; runtime: ServerSessionReadRuntime }>
  | Readonly<{ status: "invalid-config"; fields: readonly string[] }>
  | Readonly<{ status: "unavailable" }>;

export async function openServerSessionReadRuntime(
  environment: Readonly<Record<string, unknown>>,
  dependencies: RuntimeDependencies = defaultDependencies,
): Promise<ServerSessionRuntimeOpenResult> {
  const parsed = parseServerSessionRuntimeConfig(environment);
  if (parsed.status !== "valid") return parsed;

  const { redis, web, keys } = parsed.config;
  let connection: Awaited<ReturnType<typeof connectSessionRedis>>;
  try {
    connection = await dependencies.connectRedis({
      url: redis.url,
      connectTimeoutMs: redis.connectTimeoutMs,
      commandTimeoutMs: redis.commandTimeoutMs,
    });
  } catch {
    return Object.freeze({ status: "unavailable" });
  }

  if (connection.status === "invalid-config") {
    return Object.freeze({
      status: "invalid-config",
      fields: Object.freeze(["OMTS_WEB_SESSION_REDIS_URL"]),
    });
  }
  if (connection.status !== "connected") {
    return Object.freeze({ status: "unavailable" });
  }

  try {
    const store = dependencies.createStore(
      connection.connection.commands,
      redis.namespace,
      dependencies.clock,
    );
    const protector = dependencies.createProtector(keys);
    const resolver = createServerSessionResolver({
      cookieReader: {
        read(header) {
          return readSessionCookie(header, web.cookie.name);
        },
      },
      store,
      tokenOpener: protector,
      clock: dependencies.clock,
    });
    let closed = false;

    const runtime: ServerSessionReadRuntime = Object.freeze({
      async resolve(cookieHeader) {
        if (closed) return Object.freeze({ status: "unavailable" });
        return resolver.resolve(cookieHeader);
      },
      async resolveApplication(cookieHeader) {
        if (closed) return Object.freeze({ status: "unavailable" });
        return guardApplicationSession(await resolver.resolve(cookieHeader));
      },
      close() {
        if (closed) return;
        closed = true;
        connection.connection.close();
      },
    });

    return Object.freeze({ status: "ready", runtime });
  } catch {
    connection.connection.close();
    return Object.freeze({ status: "unavailable" });
  }
}
