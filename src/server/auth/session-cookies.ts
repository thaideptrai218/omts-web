import "server-only";
import { parseServerWebSessionConfig } from "../config/web-session-config";

// Access token: sent to every route. Refresh token: only to /api/auth/*, so ordinary page and
// data requests never carry it. Both are HttpOnly and never reach JavaScript.
const MAX_HEADER_LENGTH = 16_384;
const MAX_AGE_LIMIT_SECONDS = 60 * 60 * 24 * 90;
// Browsers cap cookie lifetime at about 400 days; the device id is meant to outlive any session.
const DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const tokenValue = /^[A-Za-z0-9._~+/=-]{1,4096}$/;
const rawValue = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/;

export type CookieReadResult = Readonly<{ status: "found"; value: string }>
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "invalid-cookie" }>;
const missing: CookieReadResult = Object.freeze({ status: "missing" });
const invalid: CookieReadResult = Object.freeze({ status: "invalid-cookie" });

// Reads the raw Cookie header rather than a map that has already collapsed duplicates:
// a duplicated name is ambiguous and is refused. Segments that do not belong to the requested name
// (other sites' cookies, however malformed) are ignored; only the requested cookie is held to the strict format.
function readCookie(header: unknown, name: string): CookieReadResult {
  if (header === null || header === undefined || header === "") return missing;
  if (typeof header !== "string" || header.length > MAX_HEADER_LENGTH) return invalid;
  let found: string | undefined;
  for (const segment of header.split(";")) {
    const pair = segment.replace(/^[ \t]+|[ \t]+$/g, "");
    const separator = pair.indexOf("=");
    if (separator < 1 || pair.slice(0, separator) !== name) continue;
    const value = pair.slice(separator + 1);
    if (!rawValue.test(value)) return invalid;
    if (found !== undefined) return invalid;
    found = value;
  }
  if (found === undefined) return missing;
  return tokenValue.test(found) ? Object.freeze({ status: "found", value: found }) : invalid;
}

export type IssuedTokens = Readonly<{
  accessToken: string;
  accessMaxAgeSeconds: number;
  // Present only when the API issued a new refresh token. Absent leaves the stored one untouched.
  refresh?: Readonly<{ token: string; maxAgeSeconds: number }>;
}>;

export function createSessionCookieHelpers(environment: Readonly<Record<string, unknown>>) {
  const parsed = parseServerWebSessionConfig(environment);
  if (parsed.status !== "valid") return parsed;
  const { cookies: names } = parsed.config;
  const secure = names.secure ? "; Secure" : "";
  const base = `HttpOnly${secure}; SameSite=Lax`;
  const expired = "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

  function serialize(name: string, value: string, path: string, maxAgeSeconds: number, limitSeconds = MAX_AGE_LIMIT_SECONDS): string | undefined {
    if (!tokenValue.test(value) || !Number.isInteger(maxAgeSeconds)
      || maxAgeSeconds < 1 || maxAgeSeconds > limitSeconds) return undefined;
    return `${name}=${value}; Path=${path}; ${base}; Max-Age=${maxAgeSeconds}`;
  }

  const cookies = Object.freeze({
    readAccess: (header: unknown) => readCookie(header, names.access),
    readRefresh: (header: unknown) => readCookie(header, names.refresh),
    readFlow: (header: unknown) => readCookie(header, names.flow),
    // Random id of this browser. A malformed value is treated as absent: the login handler issues a fresh one.
    readDevice(header: unknown): string | undefined {
      const cookie = readCookie(header, names.device);
      return cookie.status === "found" && DEVICE_ID_PATTERN.test(cookie.value) ? cookie.value : undefined;
    },
    // Set-Cookie header values, or undefined when a value or lifetime is not storable.
    issue(tokens: IssuedTokens): readonly string[] | undefined {
      const access = serialize(names.access, tokens.accessToken, "/", tokens.accessMaxAgeSeconds);
      const refresh = tokens.refresh ? serialize(names.refresh, tokens.refresh.token, names.refreshPath, tokens.refresh.maxAgeSeconds) : undefined;
      if (access === undefined || (tokens.refresh && refresh === undefined)) return undefined;
      return Object.freeze(refresh ? [access, refresh] : [access]);
    },
    // Expiry tombstones for both session cookies. This is not server-side revocation.
    clear(): readonly string[] {
      return Object.freeze([
        `${names.access}=; Path=/; ${base}; ${expired}`,
        `${names.refresh}=; Path=${names.refreshPath}; ${base}; ${expired}`,
      ]);
    },
    // One-shot loop guard for a refresh redirect: written by the refresh handler, consumed by proxy.ts.
    issueMarker: () => `${names.marker}=1; Path=/; ${base}; Max-Age=30`,
    // Sealed state of one short verification flow; only the verification handler receives it.
    issueFlow: (value: string, maxAgeSeconds: number) => serialize(names.flow, value, names.flowPath, maxAgeSeconds),
    clearFlow: () => `${names.flow}=; Path=${names.flowPath}; ${base}; ${expired}`,
    // Long-lived device id (128 random bits, base64url). Only the auth handlers receive it, to name the device at login.
    issueDevice: (deviceId: string) => DEVICE_ID_PATTERN.test(deviceId)
      ? serialize(names.device, deviceId, names.refreshPath, DEVICE_MAX_AGE_SECONDS, DEVICE_MAX_AGE_SECONDS) : undefined,
  });
  return Object.freeze({ status: "available", cookies } as const);
}

export type SessionCookies = Extract<ReturnType<typeof createSessionCookieHelpers>, { status: "available" }>["cookies"];
