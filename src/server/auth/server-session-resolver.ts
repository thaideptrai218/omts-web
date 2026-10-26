import "server-only";

import { inspect } from "node:util";
import type { SessionCookieReadResult } from "./session-cookie-reader";
import { checkAccessBoundExpiry } from "./session-expiry";
import type {
  SessionClock,
  SessionIdentity,
  SessionPhase,
  SessionStore,
  StoredSession,
} from "./session-store";
import type { TokenOpeningResult } from "./session-token-open";
import type { TokenProtectionContext } from "./session-token-format";

type CookieReader = Readonly<{
  read(header: unknown): SessionCookieReadResult;
}>;

type TokenOpener = Readonly<{
  open(input: unknown, context: unknown): Promise<TokenOpeningResult>;
}>;

type InvalidSessionReason =
  | "invalid-cookie"
  | "missing-session"
  | "expired"
  | "revoked"
  | "invalid-session";

export type ServerSessionResolution =
  | Readonly<{ status: "anonymous" }>
  | Readonly<{
    status: "invalid-session";
    reason: InvalidSessionReason;
    clearCookie: true;
  }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "resolved"; session: ResolvedServerSession }>;

const anonymous: ServerSessionResolution = Object.freeze({ status: "anonymous" });
const unavailable: ServerSessionResolution = Object.freeze({ status: "unavailable" });

function invalidSession(reason: InvalidSessionReason): ServerSessionResolution {
  return Object.freeze({ status: "invalid-session", reason, clearCookie: true });
}

function tokenContext(session: StoredSession): TokenProtectionContext {
  return {
    idHash: session.idHash,
    identity: session.identity,
    phase: session.phase,
    accessExpiresAtMs: session.accessExpiresAtMs,
    refreshExpiresAtMs: session.refreshExpiresAtMs,
    expiresAtMs: session.expiresAtMs,
  };
}

/**
 * Internal server capability for one active BFF session.
 * It is deliberately not serializable and exposes no refresh token.
 */
export class ResolvedServerSession {
  readonly identity: SessionIdentity;
  readonly phase: SessionPhase;
  readonly revision: string;
  readonly expiresAtMs: number;
  #idHash: string;
  #accessToken: string;

  constructor(session: StoredSession, accessToken: string) {
    this.identity = Object.freeze({ ...session.identity });
    this.phase = session.phase;
    this.revision = session.revision;
    this.expiresAtMs = session.expiresAtMs;
    this.#idHash = session.idHash;
    this.#accessToken = accessToken;
    Object.freeze(this);
  }

  readAccessTokenForBackend(): string {
    return this.#accessToken;
  }

  readIdHashForSessionStore(): string {
    return this.#idHash;
  }

  toJSON(): never {
    throw new Error("RESOLVED_SERVER_SESSION_NOT_SERIALIZABLE");
  }

  toString(): string {
    return "ResolvedServerSession [REDACTED]";
  }

  [Symbol.toPrimitive](): string {
    return this.toString();
  }

  [inspect.custom](): string {
    return this.toString();
  }
}

export function createServerSessionResolver(dependencies: Readonly<{
  cookieReader: CookieReader;
  store: SessionStore;
  tokenOpener: TokenOpener;
  clock: SessionClock;
}>) {
  const { cookieReader, store, tokenOpener, clock } = dependencies;

  return Object.freeze({
    async resolve(cookieHeader: unknown): Promise<ServerSessionResolution> {
      let cookie: SessionCookieReadResult;
      try {
        cookie = cookieReader.read(cookieHeader);
      } catch {
        return unavailable;
      }

      if (cookie.status === "missing") return anonymous;
      if (cookie.status === "invalid-cookie") return invalidSession("invalid-cookie");
      if (cookie.status !== "found") return unavailable;

      let stored: Awaited<ReturnType<SessionStore["read"]>>;
      try {
        stored = await store.read(cookie.idHash);
      } catch {
        return unavailable;
      }

      if (stored.status === "missing") return invalidSession("missing-session");
      if (stored.status === "expired") return invalidSession("expired");
      if (stored.status === "revoked") return invalidSession("revoked");
      if (stored.status === "unavailable" || stored.status === "invalid-input") {
        return unavailable;
      }
      if (stored.status !== "found") return unavailable;

      const expiry = checkAccessBoundExpiry(stored.session, clock);
      if (expiry.status === "expired") return invalidSession("expired");
      if (expiry.status === "invalid-input") return invalidSession("invalid-session");
      if (expiry.status === "unavailable") return unavailable;

      let opened: TokenOpeningResult;
      try {
        opened = await tokenOpener.open(
          stored.session.protectedTokens,
          tokenContext(stored.session),
        );
      } catch {
        return unavailable;
      }

      if (opened.status === "unavailable") return unavailable;
      if (opened.status === "invalid-protected-tokens") {
        return invalidSession("invalid-session");
      }
      if (opened.status !== "opened") return unavailable;

      // A remote key provider can take long enough for the access-bound deadline
      // to pass. Recheck after opening, before issuing a usable capability.
      const finalExpiry = checkAccessBoundExpiry(stored.session, clock);
      if (finalExpiry.status === "expired") return invalidSession("expired");
      if (finalExpiry.status !== "active") return unavailable;

      return Object.freeze({
        status: "resolved",
        session: new ResolvedServerSession(stored.session, opened.tokens.accessToken),
      });
    },
  });
}
