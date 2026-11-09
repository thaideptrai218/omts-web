import "server-only";

import { authTokensSchema, refreshRequestSchema, type AuthTokensDto } from "@/features/auth/api/auth-contract.schemas";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";
import type { ClientMeta } from "../backend/client-meta";
import { createSessionCookieHelpers, type SessionCookies } from "./session-cookies";
import { sessionFromAccessToken, type ResolvedServerSession, type SessionClock } from "./server-session-resolver";

type BackendRequester = Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;

// An access token this close to expiry is renewed first so it cannot lapse in flight.
export const ACCESS_RENEWAL_SKEW_MS = 10_000;

export type RefreshOutcome =
  | Readonly<{ status: "refreshed"; session: ResolvedServerSession; tokens: AuthTokensDto; cookies: readonly string[] }>
  // No refresh cookie to try.
  | Readonly<{ status: "no-refresh-token" }>
  // The API definitively refused the token (401/403) or the cookie is not a token at all.
  | Readonly<{ status: "rejected" }>
  // Timeout, 5xx, rate limit or an unreadable answer: nothing is known, nothing may be cleared.
  | Readonly<{ status: "unavailable" }>;

// .NET can emit sub-millisecond precision; truncate rather than rely on a permissive parser.
export function epochMilliseconds(value: string): number {
  return Date.parse(value.replace(/\.(\d+)(?=Z|[+-]\d{2}:\d{2}$)/, (_, digits: string) => "." + digits.padEnd(3, "0").slice(0, 3)));
}

// Cookies for a token response. A response that carries the refresh token the browser already holds
// (a replayed or racing refresh answered from the grace window) must never rewrite the refresh cookie.
export function cookiesForTokens(cookies: SessionCookies, tokens: AuthTokensDto, now: number): readonly string[] | undefined {
  const accessMaxAgeSeconds = Math.floor((epochMilliseconds(tokens.accessTokenExpiresAt) - now) / 1000);
  const refreshMaxAgeSeconds = Math.floor((epochMilliseconds(tokens.refreshTokenExpiresAt) - now) / 1000);
  return cookies.issue({
    accessToken: tokens.accessToken, accessMaxAgeSeconds,
    ...(tokens.refreshTokenRotated ? { refresh: { token: tokens.refreshToken, maxAgeSeconds: refreshMaxAgeSeconds } } : {}),
  });
}

export type Authentication =
  | Readonly<{ status: "ready"; session: ResolvedServerSession; cookies: readonly string[] }>
  | Readonly<{ status: "anonymous" | "rejected" | "unavailable" }>;

export function createSessionRefresher(dependencies: Readonly<{
  environment: Readonly<Record<string, unknown>>;
  backend: BackendRequester;
  clock: SessionClock;
}>) {
  const { backend, clock } = dependencies;
  const parsed = createSessionCookieHelpers(dependencies.environment);
  const cookies = parsed.status === "available" ? parsed.cookies : undefined;
  const unavailable = Object.freeze({ status: "unavailable" } as const);

  async function refresh(cookieHeader: unknown, client?: ClientMeta): Promise<RefreshOutcome> {
    if (!cookies) return unavailable;
    const cookie = cookies.readRefresh(cookieHeader);
    if (cookie.status === "missing") return Object.freeze({ status: "no-refresh-token" });
    if (cookie.status === "invalid-cookie" || !refreshRequestSchema.safeParse({ refreshToken: cookie.value }).success) {
      return Object.freeze({ status: "rejected" });
    }
    // No request signal: a browser that navigates away mid-refresh must not abandon a rotation
    // the API has already committed.
    const response = await backend.request({ endpoint: "refresh", body: { refreshToken: cookie.value } }, { client })
      .catch((): BackendTransportResult => ({ status: "unavailable" }));
    if (response.status === "http-error") {
      return response.httpStatus === 401 || response.httpStatus === 403 ? Object.freeze({ status: "rejected" }) : unavailable;
    }
    if (response.status !== "success") return unavailable;
    const tokens = authTokensSchema.safeParse(response.data);
    const session = tokens.success ? sessionFromAccessToken(tokens.data.accessToken) : undefined;
    if (!tokens.success || !session || session.identity.accountId.toLowerCase() !== tokens.data.accountId.toLowerCase()) return unavailable;
    const set = cookiesForTokens(cookies, tokens.data, clock());
    return set ? Object.freeze({ status: "refreshed", session, tokens: tokens.data, cookies: set }) : unavailable;
  }

  // A usable access token for a Route Handler: the cookie value when it has time left, otherwise a
  // renewal through the refresh cookie. `cookies` are the Set-Cookie values the response must carry.
  async function authenticate(cookieHeader: unknown, client?: ClientMeta): Promise<Authentication> {
    if (!cookies) return unavailable;
    const access = cookies.readAccess(cookieHeader);
    if (access.status === "found") {
      const session = sessionFromAccessToken(access.value);
      if (session && session.expiresAtMs - ACCESS_RENEWAL_SKEW_MS > clock()) return { status: "ready", session, cookies: [] };
    }
    const renewed = await refresh(cookieHeader, client);
    if (renewed.status === "refreshed") return { status: "ready", session: renewed.session, cookies: renewed.cookies };
    return renewed.status === "no-refresh-token" ? { status: "anonymous" } : renewed;
  }

  return Object.freeze({ refresh, authenticate });
}

export type SessionRefresher = ReturnType<typeof createSessionRefresher>;
