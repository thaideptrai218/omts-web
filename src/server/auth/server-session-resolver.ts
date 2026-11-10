import "server-only";

import { inspect } from "node:util";
import { readAccessTokenClaims, type AccessTokenClaims } from "./access-token-claims";
import type { SessionCookies } from "./session-cookies";

type InvalidSessionReason = "invalid-cookie" | "invalid-session";
export type SessionClock = () => number;

export type ServerSessionResolution =
  | Readonly<{ status: "anonymous" }>
  | Readonly<{ status: "invalid-session"; reason: InvalidSessionReason; clearCookie: true }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "resolved"; session: ResolvedServerSession }>;

const anonymous: ServerSessionResolution = Object.freeze({ status: "anonymous" });

export type SessionIdentity = Readonly<{
  accountId: string;
  // The API's own session id (the access token `sid`), also the revocation unit.
  backendSessionId: string;
  subjectType: AccessTokenClaims["subjectType"];
}>;

/**
 * Internal server capability for the access token of one request.
 * Built from the token's own claims: the API verifies the signature on every call, so these
 * values describe the request and never authorize it. Not serializable, exposes no refresh token.
 */
export class ResolvedServerSession {
  readonly identity: SessionIdentity;
  readonly expiresAtMs: number;
  #accessToken: string;

  constructor(claims: AccessTokenClaims, accessToken: string) {
    this.identity = Object.freeze({
      accountId: claims.accountId, backendSessionId: claims.sessionId, subjectType: claims.subjectType,
    });
    this.expiresAtMs = claims.expiresAtMs;
    this.#accessToken = accessToken;
    Object.freeze(this);
  }

  readAccessTokenForBackend(): string { return this.#accessToken; }

  toJSON(): never { throw new Error("RESOLVED_SERVER_SESSION_NOT_SERIALIZABLE"); }
  toString(): string { return "ResolvedServerSession [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

export function sessionFromAccessToken(accessToken: string): ResolvedServerSession | undefined {
  const claims = readAccessTokenClaims(accessToken);
  return claims ? new ResolvedServerSession(claims, accessToken) : undefined;
}

export function createServerSessionResolver(dependencies: Readonly<{
  cookies: Pick<SessionCookies, "readAccess">;
  clock: SessionClock;
}>) {
  const { cookies, clock } = dependencies;
  return Object.freeze({
    // Cookie only, no network. A missing or lapsed access cookie is anonymous here: whether a refresh
    // token can still renew it is decided by the refresh handler, never during a render.
    resolve(cookieHeader: unknown): ServerSessionResolution {
      const cookie = cookies.readAccess(cookieHeader);
      if (cookie.status === "missing") return anonymous;
      if (cookie.status !== "found") return Object.freeze({ status: "invalid-session", reason: "invalid-cookie", clearCookie: true });
      const session = sessionFromAccessToken(cookie.value);
      if (!session) return Object.freeze({ status: "invalid-session", reason: "invalid-session", clearCookie: true });
      const now = clock();
      if (!Number.isFinite(now)) return Object.freeze({ status: "unavailable" });
      return session.expiresAtMs <= now ? anonymous : Object.freeze({ status: "resolved", session });
    },
  });
}
