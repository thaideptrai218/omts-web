import "server-only";
import { createClient } from "@redis/client";
import { z } from "zod";

export type SessionRedisCommands = Readonly<{
  get(key: string): Promise<unknown>;
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}>;

const timeout = z.number().int().min(1).max(60_000);
const configSchema = z.strictObject({
  url: z.string().max(4096).refine((value) => {
    try {
      const url = new URL(value);
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      return (url.protocol === "rediss:" || (url.protocol === "redis:" && loopback))
        && !!url.hostname && !url.hash && !url.search && /^\/\d*$/.test(url.pathname || "/");
    } catch { return false; }
  }),
  connectTimeoutMs: timeout,
  commandTimeoutMs: timeout,
});

type RedisConnection = Readonly<{
  commands: SessionRedisCommands;
  close(): void;
}>;
type ConnectionResult = { status: "connected"; connection: RedisConnection }
  | { status: "invalid-config" | "unavailable" };

// Explicit composition only: no environment reads, default endpoint or RAM fallback.
export async function connectSessionRedis(config: z.infer<typeof configSchema>): Promise<ConnectionResult> {
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) return { status: "invalid-config" };
  let client: ReturnType<typeof createClient> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    client = createClient({
      url: parsed.data.url,
      socket: { connectTimeout: parsed.data.connectTimeoutMs, reconnectStrategy: false },
      commandOptions: { timeout: parsed.data.commandTimeoutMs },
      disableOfflineQueue: true,
      maintNotifications: "disabled",
    });
    // EventEmitter needs a listener. Command/connect failures are returned without raw errors/URLs.
    client.on("error", () => {});
    // Socket connectTimeout alone does not bound the subsequent Redis handshake.
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error("Session store unavailable")), parsed.data.connectTimeoutMs);
      }),
    ]);
    const connected = client;
    function requireReady() {
      if (!connected.isReady) throw new Error("Session store unavailable");
    }
    return {
      status: "connected",
      connection: {
        commands: {
          async get(key) { requireReady(); return connected.get(key); },
          async eval(script, options) { requireReady(); return connected.eval(script, options); },
        },
        close() { if (connected.isOpen) connected.destroy(); },
      },
    };
  } catch {
    if (client?.isOpen) client.destroy();
    return { status: "unavailable" };
  } finally {
    if (deadline !== undefined) clearTimeout(deadline);
  }
}
