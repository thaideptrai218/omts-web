import "server-only";
import { z } from "zod";
import { sessionCookieNames, type SessionCookieNames } from "../auth/session-cookie-names";

const environmentInput = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  OMTS_WEB_ORIGIN: z.string(),
  OMTS_WEB_COOKIE_PROFILE: z.enum(["https", "http-loopback-dev"]),
  NEXT_PUBLIC_OMTS_WEB_ORIGIN: z.never().optional(),
  NEXT_PUBLIC_OMTS_WEB_COOKIE_PROFILE: z.never().optional(),
});
type ConfigField = keyof z.infer<typeof environmentInput>;
type CookieAttributes = Readonly<{ httpOnly: true; sameSite: "lax"; secure: boolean }>;
export type ServerWebSessionConfig = Readonly<{
  origin: string;
  cookieProfile: "https" | "http-loopback-dev";
  cookies: SessionCookieNames & CookieAttributes;
}>;

type ConfigResult = Readonly<{ status: "valid"; config: ServerWebSessionConfig }>
  | Readonly<{ status: "invalid-config"; fields: readonly ConfigField[] }>;
function invalid(fields: readonly ConfigField[]): ConfigResult {
  return Object.freeze({ status: "invalid-config", fields: Object.freeze([...fields]) });
}

function readOrigin(value: string) {
  // Origin only. Refuse URL normalization of credentials/paths/escapes/backslashes.
  const authority = /^https?:\/\/([^/?#\\\s@%,;*]+)\/?$/iu.exec(value)?.[1];
  if (!authority || authority.endsWith(":")) return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password || !url.hostname || url.port === "0") return undefined;
    // HTTP dev requires an explicit loopback spelling, not integer/short IPv4 aliases.
    const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/iu.test(authority);
    return { origin: url.origin, protocol: url.protocol, loopback };
  } catch { return undefined; }
}

// Explicit server configuration only: no process.env, request headers, cookies,
// default origin/profile, backend calls or application-composition changes.
export function parseServerWebSessionConfig(environment: Readonly<Record<string, unknown>>): ConfigResult {
  try {
    const parsed = environmentInput.safeParse(environment);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0])
        .filter((field): field is ConfigField => typeof field === "string" && Object.hasOwn(environmentInput.shape, field)))];
      return invalid(fields);
    }
    const env = parsed.data;
    const origin = readOrigin(env.OMTS_WEB_ORIGIN);
    if (!origin) return invalid(["OMTS_WEB_ORIGIN"]);
    if (env.OMTS_WEB_COOKIE_PROFILE === "https") {
      if (origin.protocol !== "https:") return invalid(["OMTS_WEB_ORIGIN"]);
      const cookies = Object.freeze({ ...sessionCookieNames("https"), httpOnly: true, secure: true, sameSite: "lax" } as const);
      const config = Object.freeze({ origin: origin.origin, cookieProfile: "https", cookies } as const);
      return Object.freeze({ status: "valid", config });
    }
    if (env.NODE_ENV === "production") return invalid(["OMTS_WEB_COOKIE_PROFILE"]);
    if (origin.protocol !== "http:" || !origin.loopback) return invalid(["OMTS_WEB_ORIGIN"]);
    const cookies = Object.freeze({ ...sessionCookieNames("http-loopback-dev"), httpOnly: true, secure: false, sameSite: "lax" } as const);
    const config = Object.freeze({ origin: origin.origin, cookieProfile: "http-loopback-dev", cookies } as const);
    return Object.freeze({ status: "valid", config });
  } catch {
    // Even malformed caller objects/getters must not leak environment values/cause.
    return invalid([]);
  }
}
