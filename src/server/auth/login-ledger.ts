// Internal BFF data contracts only. No cookie, credential or browser DTO.
// Bootstrap must mint a fresh context; mutations below never upsert a missing one.
export type LoginSessionBinding = Readonly<{
  sessionHash: string;
  sessionRevision: string;
  expiresAtMs: number;
}>;

export type LoginLedgerState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "pending"; attemptId: string; pendingUntilMs: number }>
  | Readonly<{ kind: "check-required" }>
  | Readonly<{ kind: "active"; binding: LoginSessionBinding }>
  | Readonly<{ kind: "revoked" }>;

export type LoginLedgerContext = Readonly<{
  contextHash: string;
  revision: string;
  generation: number;
  createdAtMs: number;
  expiresAtMs: number;
  state: LoginLedgerState;
}>;

export type LoginAttempt = Readonly<{
  contextHash: string;
  generation: number;
  attemptId: string;
}>;

type Failure<Status extends string> = Readonly<{ status: Status }>;
export type LoginLedgerFailure = Failure<"missing" | "expired" | "invalid-input" | "unavailable">;
export type LoginLedgerReadResult = Readonly<{ status: "found"; context: LoginLedgerContext }> | LoginLedgerFailure;
export type LoginLedgerWriteResult = Readonly<{ status: "updated"; context: LoginLedgerContext }>
  | Failure<"conflict" | "blocked"> | LoginLedgerFailure;

// Each operation is one atomic store action. RAM implements a reference model
// for tests only; a future Redis adapter must enforce the same checks atomically.
export type LoginLedger = Readonly<{
  read(contextHash: string): Promise<LoginLedgerReadResult>;
  begin(input: Readonly<{ contextHash: string; expectedRevision: string; pendingUntilMs: number }>):
    Promise<Readonly<{ status: "started"; context: LoginLedgerContext; attempt: LoginAttempt }>
      | Failure<"conflict" | "blocked"> | LoginLedgerFailure>;
  publish(input: Readonly<{ attempt: LoginAttempt; binding: LoginSessionBinding }>): Promise<LoginLedgerWriteResult>;
  settle(input: Readonly<{ attempt: LoginAttempt; outcome: "rejected" | "unknown" }>): Promise<LoginLedgerWriteResult>;
  invalidate(input: Readonly<{ contextHash: string; expectedRevision: string }>): Promise<LoginLedgerWriteResult>;
  matchBinding(input: Readonly<{
    contextHash: string; sessionHash: string; sessionRevision: string;
  }>): Promise<Failure<"matched" | "not-matched"> | LoginLedgerFailure>;
}>;
