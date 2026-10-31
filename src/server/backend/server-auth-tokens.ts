import "server-only";
import { inspect } from "node:util";
import { authTokensSchema, type AuthTokensDto } from "../../features/auth/api/auth-contract.schemas";

// A class/private field is deliberately NOT a plain RSC/JSON DTO. This is an
// accidental-disclosure guard, not encryption or a replacement for authorization.
class ServerAuthTokens {
  #tokens: Readonly<AuthTokensDto>;

  constructor(tokens: AuthTokensDto) {
    this.#tokens = Object.freeze({ ...tokens });
    Object.freeze(this);
  }

  // Explicit escape hatch for future server token protection/session creation.
  // The returned plaintext is sensitive; encrypt before storage, and never pass
  // it to logs, JSON or RSC. Reading it bypasses this wrapper's disclosure guard.
  readForSessionStore(): Readonly<AuthTokensDto> { return this.#tokens; }

  toJSON(): never { throw new Error("SERVER_AUTH_TOKENS_NOT_SERIALIZABLE"); }
  toString(): string { return "ServerAuthTokens [REDACTED]"; }
  [Symbol.toPrimitive](): string { return this.toString(); }
  [inspect.custom](): string { return this.toString(); }
}

export function parseServerAuthTokens(input: unknown):
  Readonly<{ status: "validated"; credentials: ServerAuthTokens }>
  | Readonly<{ status: "invalid-data" }> {
  try {
    const parsed = authTokensSchema.safeParse(input);
    return parsed.success ? { status: "validated", credentials: new ServerAuthTokens(parsed.data) }
      : { status: "invalid-data" };
  } catch {
    return { status: "invalid-data" };
  }
}
