import "server-only";
import { z } from "zod";

const environmentSchema = z.enum(["development", "test", "production"]);
const environmentInput = z.object({
  NODE_ENV: environmentSchema,
  OMTS_DATA_SOURCE: z.enum(["mock", "api"]),
  OMTS_API_BASE_URL: z.string().optional(),
  OMTS_API_TIMEOUT_MS: z.string().regex(/^[1-9]\d{0,4}$/).refine((v) => Number(v) <= 60_000).optional(),
  NEXT_PUBLIC_API_BASE_URL: z.never().optional(),
  NEXT_PUBLIC_OMTS_API_BASE_URL: z.never().optional(),
});
type ConfigField = keyof z.infer<typeof environmentInput>;
export type ServerBackendConfig = Readonly<{ source: "mock" }>
  | Readonly<{ source: "api"; origin: string; timeoutMs: number }>;
type ConfigResult = Readonly<{ status: "valid"; config: ServerBackendConfig }>
  | Readonly<{ status: "invalid-config"; fields: readonly ConfigField[] }>;

function backendOrigin(value: string, environment: z.infer<typeof environmentSchema>): string | undefined {
  // Origin only. Reject paths, credentials, queries, fragments, escaping and backslash normalization.
  if (!/^https?:\/\/[^/?#\\\s]+\/?$/iu.test(value) || value.includes("%") || value.includes("@")) return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password || !url.hostname) return undefined;
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback && environment !== "production")) {
      return undefined;
    }
    return url.origin;
  } catch { return undefined; }
}

// Caller supplies server environment explicitly. No import-time reads, network calls or source switching.
export function parseServerBackendConfig(environment: Readonly<Record<string, unknown>>): ConfigResult {
  const parsed = environmentInput.safeParse(environment);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0])
      .filter((field): field is ConfigField => typeof field === "string" && Object.hasOwn(environmentInput.shape, field)))];
    return { status: "invalid-config", fields };
  }
  const env = parsed.data;
  if (env.OMTS_DATA_SOURCE === "mock") {
    const fields: ConfigField[] = [];
    if (env.OMTS_API_BASE_URL !== undefined) fields.push("OMTS_API_BASE_URL");
    if (env.OMTS_API_TIMEOUT_MS !== undefined) fields.push("OMTS_API_TIMEOUT_MS");
    return fields.length ? { status: "invalid-config", fields }
      : { status: "valid", config: Object.freeze({ source: "mock" }) };
  }
  const origin = env.OMTS_API_BASE_URL === undefined ? undefined : backendOrigin(env.OMTS_API_BASE_URL, env.NODE_ENV);
  const fields: ConfigField[] = [];
  if (!origin) fields.push("OMTS_API_BASE_URL");
  if (env.OMTS_API_TIMEOUT_MS === undefined) fields.push("OMTS_API_TIMEOUT_MS");
  if (fields.length || !origin || env.OMTS_API_TIMEOUT_MS === undefined) return { status: "invalid-config", fields };
  return { status: "valid", config: Object.freeze({ source: "api", origin, timeoutMs: Number(env.OMTS_API_TIMEOUT_MS) }) };
}
