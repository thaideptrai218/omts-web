import "server-only";

import { guardApplicationSession, type ApplicationSessionGuardResult } from "./application-session-guard";
import { createRedisSessionStore } from "./redis-session-store";
import { createServerSessionResolver, type ServerSessionResolution } from "./server-session-resolver";
import { parseServerSessionRuntimeConfig } from "./server-session-runtime-config";
import { readSessionCookie } from "./session-cookie-reader";
import { connectSessionRedis } from "./session-redis-client";
import type { SessionClock, SessionStore } from "./session-store";
import { createSessionTokenProtector } from "./session-token-protector";
import { createLoginSessionService, type LoginOperationOptions, type LoginSessionResult } from "./login-session-service";
import type { createBackendTransport } from "../backend/backend-transport";
import { parseServerBackendConfig } from "../config/backend-config";

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

export type ServerSessionRuntimeOpenResult<Runtime extends ServerSessionReadRuntime = ServerSessionReadRuntime> =
  | Readonly<{ status: "ready"; runtime: Runtime }>
  | Readonly<{ status: "invalid-config"; fields: readonly string[] }>
  | Readonly<{ status: "unavailable" }>;

export async function openServerSessionReadRuntime(
  environment: Readonly<Record<string, unknown>>,
  dependencies: RuntimeDependencies = defaultDependencies,
): Promise<ServerSessionRuntimeOpenResult> {
  return openRuntime(environment, dependencies, () => ({}));
}

type RuntimeCapabilities = Readonly<{
  store: SessionStore;
  protector: ReturnType<typeof createSessionTokenProtector>;
  clock: SessionClock;
  isOpen(): boolean;
}>;

async function openRuntime<Actions extends object>(
  environment: Readonly<Record<string, unknown>>,
  dependencies: RuntimeDependencies,
  extend: (capabilities: RuntimeCapabilities) => Actions,
): Promise<ServerSessionRuntimeOpenResult<ServerSessionReadRuntime & Actions>> {
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

    const runtime: ServerSessionReadRuntime & Actions = Object.freeze({
      ...extend({ store, protector, clock: dependencies.clock, isOpen: () => !closed }),
      async resolve(cookieHeader) {
        if (closed) return Object.freeze({ status: "unavailable" });
        const result = await resolver.resolve(cookieHeader);
        return closed ? Object.freeze({ status: "unavailable" }) : result;
      },
      async resolveApplication(cookieHeader) {
        if (closed) return Object.freeze({ status: "unavailable" });
        const result = await resolver.resolve(cookieHeader);
        return closed ? Object.freeze({ status: "unavailable" }) : guardApplicationSession(result);
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

export type ServerSessionLoginRuntime = ServerSessionReadRuntime & Readonly<{
  login(input: unknown, options?: LoginOperationOptions): Promise<LoginSessionResult>;
}>;

// Preparation only: product composition still opens the read-only runtime.
export async function openServerSessionLoginRuntime(
  environment: Readonly<Record<string, unknown>>,
  backend: Pick<ReturnType<typeof createBackendTransport>, "request">,
  dependencies: RuntimeDependencies = defaultDependencies,
): Promise<ServerSessionRuntimeOpenResult<ServerSessionLoginRuntime>> {
  let snapshot: Readonly<Record<string, unknown>>;
  try { snapshot = Object.freeze({ ...environment }); }
  catch { return { status: "invalid-config", fields: ["environment"] }; }
  const source = parseServerBackendConfig(snapshot);
  if (source.status !== "valid") return source;
  if (source.config.source !== "api") return { status: "unavailable" };
  return openRuntime(snapshot, dependencies, (capabilities) => {
    const service = createLoginSessionService({ environment: snapshot, backend, ...capabilities });
    return {
      login(input: unknown, options: LoginOperationOptions = {}) {
        return service.login(input, {
          signal: options.signal,
          isCurrent: () => capabilities.isOpen() && (options.isCurrent?.() ?? true),
        });
      },
    };
  });
}
