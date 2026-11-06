import "server-only";
import { inspect } from "node:util";

type PreparedCookie = Readonly<{ readForResponseHeader(): string }>;

class PendingLoginCookie {
  #cookie: PreparedCookie;
  #canDeliver: () => boolean;

  constructor(cookie: PreparedCookie, canDeliver: () => boolean) {
    this.#cookie = cookie;
    this.#canDeliver = canDeliver;
    Object.freeze(this);
  }

  readForResponseHeader(): string {
    try {
      if (this.#canDeliver()) return this.#cookie.readForResponseHeader();
    } catch { /* Do not expose dependency errors or their causes. */ }
    throw new Error("LOGIN_DELIVERY_UNAVAILABLE");
  }

  toJSON(): never { throw new Error("SESSION_COOKIE_NOT_SERIALIZABLE"); }
  toString(): string { return "PendingLoginCookie [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

// Request-owned capability, never a browser DTO. Discarding blocks cookie reads
// synchronously, even while best-effort session cleanup is still pending.
export function createPendingLoginDelivery(
  cookie: PreparedCookie,
  canDeliver: () => boolean,
  cleanup: () => Promise<void>,
) {
  let abandoned = false;
  let cleanupPromise: Promise<void> | undefined;
  return Object.freeze({
    cookie: new PendingLoginCookie(cookie, () => !abandoned && canDeliver()),
    abandon(): Promise<void> {
      abandoned = true;
      cleanupPromise ??= Promise.resolve().then(cleanup).catch(() => undefined);
      return cleanupPromise;
    },
  });
}
