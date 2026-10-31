import "server-only";

import { z } from "zod";
import { parseServerWebSessionConfig, type ServerWebSessionConfig } from "../config/web-session-config";
import { parseServerSessionKeyring } from "./session-keyring-config";
import type { SessionKeyProvider } from "./session-token-keys";

const timeout = z.string().regex(/^[1-9]\d{0,4}$/).refine((value) => Number(value) <= 60_000);
const redisInput = z.object({
  OMTS_WEB_SESSION_REDIS_URL: z.string(),
  OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: timeout,
  OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: timeout,
  OMTS_WEB_SESSION_REDIS_NAMESPACE: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_URL: z.never().optional(),
  NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: z.never().optional(),
  NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: z.never().optional(),
  NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_NAMESPACE: z.never().optional(),
});

export type ServerSessionRuntimeConfig = Readonly<{
  web: ServerWebSessionConfig;
  redis: Readonly<{
    url: string;
    connectTimeoutMs: number;
    commandTimeoutMs: number;
    namespace: string;
  }>;
  keys: SessionKeyProvider;
}>;

export type ServerSessionRuntimeConfigResult =
  | Readonly<{ status: "valid"; config: ServerSessionRuntimeConfig }>
  | Readonly<{ status: "invalid-config"; fields: readonly string[] }>;

export function parseServerSessionRuntimeConfig(
  environment: Readonly<Record<string, unknown>>,
): ServerSessionRuntimeConfigResult {
  try {
    const web = parseServerWebSessionConfig(environment);
    const keyring = parseServerSessionKeyring(environment);
    const redis = redisInput.safeParse(environment);
    const fields = new Set<string>();

    if (web.status === "invalid-config") {
      for (const field of web.fields) fields.add(field);
    }
    if (keyring.status === "invalid-config") {
      for (const field of keyring.fields) fields.add(field);
    }
    if (!redis.success) {
      for (const issue of redis.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && Object.hasOwn(redisInput.shape, field)) {
          fields.add(field);
        }
      }
    }

    if (web.status !== "valid" || keyring.status !== "valid" || !redis.success) {
      return Object.freeze({
        status: "invalid-config",
        fields: Object.freeze([...fields]),
      });
    }

    return Object.freeze({
      status: "valid",
      config: Object.freeze({
        web: web.config,
        redis: Object.freeze({
          url: redis.data.OMTS_WEB_SESSION_REDIS_URL,
          connectTimeoutMs: Number(redis.data.OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS),
          commandTimeoutMs: Number(redis.data.OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS),
          namespace: redis.data.OMTS_WEB_SESSION_REDIS_NAMESPACE,
        }),
        keys: keyring.provider,
      }),
    });
  } catch {
    return Object.freeze({ status: "invalid-config", fields: Object.freeze([]) });
  }
}
