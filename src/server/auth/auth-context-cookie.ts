import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { inspect } from "node:util";
import { parseServerWebSessionConfig } from "../config/web-session-config";

const HTTPS_NAME = "__Host-omts_web_auth_context";
const LOOPBACK_NAME = "omts_web_auth_context_dev";
const canonicalId = /^[A-Za-z0-9_-]{43}$/;
const cookieToken = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const cookieValue = /^(?:[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*|"[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*")$/;

function hashContextId(value: unknown): string | null {
  if (typeof value !== "string" || !canonicalId.test(value)) return null;
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== 32 || bytes.toString("base64url") !== value) return null;
  return createHash("sha256").update("omts-bff-auth-context:v1:").update(bytes).digest("hex");
}

class PreparedContextCookie {
  #header: string;
  constructor(header: string) { this.#header = header; Object.freeze(this); }
  readForResponseHeader(): string { return this.#header; }
  toJSON(): never { throw new Error("AUTH_CONTEXT_COOKIE_NOT_SERIALIZABLE"); }
  toString(): string { return "PreparedContextCookie [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

export function createAuthContextCookieHelpers(environment: Readonly<Record<string, unknown>>) {
  const parsed = parseServerWebSessionConfig(environment);
  if (parsed.status !== "valid") return parsed;
  const name = parsed.config.cookieProfile === "https" ? HTTPS_NAME : LOOPBACK_NAME;
  const attributes = `; Path=/; HttpOnly${parsed.config.cookie.secure ? "; Secure" : ""}; SameSite=Lax`;
  return Object.freeze({ status: "available" as const, cookies: Object.freeze({
    createFresh() {
      try {
        const id = randomBytes(32).toString("base64url");
        const contextHash = hashContextId(id);
        if (!contextHash) return { status: "unavailable" } as const;
        return Object.freeze({ status: "prepared" as const, contextHash,
          cookie: new PreparedContextCookie(`${name}=${id}${attributes}`) });
      } catch { return { status: "unavailable" } as const; }
    },
    read(header: unknown) {
      if (header === null || header === undefined || header === "") return { status: "missing" } as const;
      if (typeof header !== "string" || header.length > 16_384 || /[^\x20-\x7e\t]/.test(header)) {
        return { status: "invalid-cookie" } as const;
      }
      let value: string | undefined;
      for (const segment of header.split(";")) {
        const pair = segment.replace(/^[ \t]+|[ \t]+$/g, "");
        const separator = pair.indexOf("=");
        if (separator < 1) return { status: "invalid-cookie" } as const;
        const key = pair.slice(0, separator);
        const candidate = pair.slice(separator + 1);
        if (!cookieToken.test(key) || !cookieValue.test(candidate)) return { status: "invalid-cookie" } as const;
        if (key !== name) continue;
        if (value !== undefined) return { status: "invalid-cookie" } as const;
        value = candidate;
      }
      if (value === undefined) return { status: "missing" } as const;
      const contextHash = hashContextId(value);
      return contextHash ? Object.freeze({ status: "found" as const, contextHash }) : { status: "invalid-cookie" } as const;
    },
    clear() {
      return new PreparedContextCookie(`${name}=${attributes}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    },
  }) });
}
