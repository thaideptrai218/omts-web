import type { AuthTokensDto } from "@/features/auth/api/auth-contract.schemas";

export type SessionClock = () => number;
export type SessionPhase = "password-change-required" | "contact-verification-required" | "application";

// Opaque encrypted output of the server-side token protector, never raw AuthTokens.
export type ProtectedSessionTokens = Readonly<{ keyId: string; sealed: string }>;

export type SessionIdentity = Readonly<{
  accountId: string;
  backendSessionId: string;
  subjectType: AuthTokensDto["subjectType"];
}>;

export type SessionValues = Readonly<{
  phase: SessionPhase;
  protectedTokens: ProtectedSessionTokens;
  accessExpiresAtMs: number;
  refreshExpiresAtMs: number;
  expiresAtMs: number;
}>;

export type NewSession = SessionValues & Readonly<{
  idHash: string;
  identity: SessionIdentity;
}>;

export type StoredSession = NewSession & Readonly<{
  schemaVersion: 1;
  createdAtMs: number;
  revision: string;
}>;

type Failure<Status extends string> = Readonly<{ status: Status }>;
type UnavailableOrInvalid = Failure<"unavailable" | "invalid-input">;
type AbsentSession = Failure<"missing" | "expired" | "revoked">;

export type SessionReadResult = Readonly<{ status: "found"; session: StoredSession }>
  | AbsentSession | UnavailableOrInvalid;
export type SessionCreateResult = Readonly<{ status: "created"; session: StoredSession }>
  | Failure<"exists"> | UnavailableOrInvalid;
export type SessionUpdateResult = Readonly<{ status: "updated"; session: StoredSession }>
  | Failure<"conflict"> | AbsentSession | UnavailableOrInvalid;
export type SessionRevokeResult = Failure<"revoked" | "already-revoked" | "missing" | "expired">
  | UnavailableOrInvalid;

// Internal BFF contract, not a browser DTO or backend authorization decision.
export type SessionStore = Readonly<{
  read(idHash: string): Promise<SessionReadResult>;
  create(input: NewSession): Promise<SessionCreateResult>;
  compareAndSet(idHash: string, expectedRevision: string, values: SessionValues): Promise<SessionUpdateResult>;
  revoke(idHash: string): Promise<SessionRevokeResult>;
}>;
