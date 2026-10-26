import "server-only";
import { inspect } from "node:util";
import { parseServerWebSessionConfig } from "../config/web-session-config";
import { hashSessionId } from "./session-id";
import { readSessionCookie } from "./session-cookie-reader";

// Internal response material, not a browser JSON/RSC DTO. Explicit extraction
// bypasses the disclosure guard: never log or JSON-serialize the extracted string.
class PreparedSessionCookie {
  #header: string;
  constructor(header: string) {
    this.#header = header;
    Object.freeze(this);
  }
  readForResponseHeader(): string { return this.#header; }
  toJSON(): never { throw new Error("SESSION_COOKIE_NOT_SERIALIZABLE"); }
  toString(): string { return "PreparedSessionCookie [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

type IssueResult = Readonly<{ status: "prepared"; cookie: PreparedSessionCookie }>
  | Readonly<{ status: "invalid-sid" }>;

// Explicit trusted-server environment only; parse/snapshot once, no ambient
// process.env/request state, network, session creation or response mutation.
export function createSessionCookieHelpers(environment: Readonly<Record<string, unknown>>) {
  const parsed = parseServerWebSessionConfig(environment);
  if (parsed.status !== "valid") return parsed;
  const { name, secure } = parsed.config.cookie;
  // Restricted serializer: only validated base64url SID + fixed C1A attributes.
  // Do not spread caller options or allow Domain/Path/persistence overrides.
  const attributes = `; Path=/; HttpOnly${secure ? "; Secure" : ""}; SameSite=Lax`;
  const cookies = Object.freeze({
    issue(sid: unknown): IssueResult {
      if (!hashSessionId(sid)) return Object.freeze({ status: "invalid-sid" });
      return Object.freeze({ status: "prepared", cookie: new PreparedSessionCookie(`${name}=${sid}${attributes}`) });
    },
    read(header: unknown) { return readSessionCookie(header, name); },
    clear(): PreparedSessionCookie {
      // An expiry tombstone, not a persistent login cookie or server revocation.
      return new PreparedSessionCookie(`${name}=${attributes}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    },
  });
  return Object.freeze({ status: "available", cookies } as const);
}
