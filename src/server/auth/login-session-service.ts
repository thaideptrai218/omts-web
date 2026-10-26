import "server-only";

import { loginRequestSchema, currentIdentitySchema } from "@/features/auth/api/auth-contract.schemas";
import { myPermissionsSchema } from "@/features/auth/api/permissions-contract.schema";
import type { MessageCode } from "@/shared/messages/message-catalog";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";
import { parseServerAuthTokens } from "../backend/server-auth-tokens";
import { projectPermissionsDto } from "../backend/browser-dto";
import { createSessionCookieHelpers } from "./session-cookies";
import { deriveAccessBoundExpiry, checkAccessBoundExpiry } from "./session-expiry";
import { createSessionId } from "./session-id";
import type { NewSession, SessionClock, SessionPhase, SessionStore } from "./session-store";
import type { createSessionTokenProtector } from "./session-token-protector";
import { createPendingLoginDelivery } from "./pending-login-delivery";

type BackendRequester = Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;
type PreparedCookie = Readonly<{ readForResponseHeader(): string }>;

export type LoginSessionResult =
  | Readonly<{ status: "created"; phase: SessionPhase; cookie: PreparedCookie; abandon(): Promise<void> }>
  | Readonly<{ status: "rejected"; httpStatus: number; code?: MessageCode; retryAfterMs?: number }>
  | Readonly<{ status: "invalid-input" }>
  | Readonly<{ status: "unavailable" }>;

export type LoginOperationOptions = Readonly<{
  signal?: AbortSignal;
  isCurrent?: () => boolean;
}>;

export function createLoginSessionService(dependencies: Readonly<{
  environment: Readonly<Record<string, unknown>>;
  backend: BackendRequester;
  store: SessionStore;
  protector: ReturnType<typeof createSessionTokenProtector>;
  clock: SessionClock;
}>) {
  const { backend, store, protector, clock } = dependencies;
  const cookies = createSessionCookieHelpers(dependencies.environment);

  async function send(input: BackendRequest, signal?: AbortSignal): Promise<BackendTransportResult> {
    try {
      if (signal?.aborted) return { status: "unavailable" };
      return await (signal ? backend.request(input, { signal }) : backend.request(input));
    } catch { return { status: "unavailable" }; }
  }

  return Object.freeze({
    async login(input: unknown, options: LoginOperationOptions = {}): Promise<LoginSessionResult> {
      function active() {
        try { return !options.signal?.aborted && (options.isCurrent?.() ?? true); }
        catch { return false; }
      }
      if (cookies.status !== "available" || !active()) return { status: "unavailable" };
      let parsed: ReturnType<typeof loginRequestSchema.safeParse>;
      try {
        if (typeof input !== "object" || input === null) return { status: "invalid-input" };
        const values = input as Record<string, unknown>;
        parsed = loginRequestSchema.safeParse({
          identifier: typeof values.identifier === "string" ? values.identifier.trim() : values.identifier,
          password: values.password, clientType: "Web",
        });
      } catch { return { status: "invalid-input" }; }
      if (!parsed.success) return { status: "invalid-input" };

      const response = await send({ endpoint: "login", body: parsed.data }, options.signal);
      if (response.status === "http-error") return {
        status: "rejected", httpStatus: response.httpStatus,
        code: response.code, retryAfterMs: response.retryAfterMs,
      };
      if (response.status !== "success") return { status: "unavailable" };
      const tokens = parseServerAuthTokens(response.data);
      if (tokens.status !== "validated") return { status: "unavailable" };
      const credentials = tokens.credentials.readForSessionStore();
      let completed = false;
      let candidateHash: string | undefined;
      let candidateSeal: string | undefined;

      async function cleanup() {
        // No replay and no claim that an unavailable revocation succeeded.
        if (candidateHash !== undefined && candidateSeal !== undefined) {
          try {
            const current = await store.read(candidateHash);
            if (current.status === "found" && current.session.protectedTokens.sealed === candidateSeal) {
              await store.revoke(candidateHash);
            }
          } catch { /* Keep failure redacted. */ }
        }
        // Cleanup must not inherit the browser's already-aborted signal.
        await send({ endpoint: "logout", accessToken: credentials.accessToken });
      }

      try {
        if (!active()) return { status: "unavailable" };
        const identityResponse = await send({ endpoint: "identity", accessToken: credentials.accessToken }, options.signal);
        if (!active() || identityResponse.status !== "success") return { status: "unavailable" };
        const identity = currentIdentitySchema.safeParse(identityResponse.data);
        if (!identity.success || identity.data.accountId.toLowerCase() !== credentials.accountId.toLowerCase()
          || identity.data.subjectType !== credentials.subjectType) return { status: "unavailable" };

        const lifetime = deriveAccessBoundExpiry(credentials, clock);
        if (lifetime.status !== "active") return { status: "unavailable" };
        const phase: SessionPhase = credentials.mustChangePassword ? "password-change-required"
          : credentials.phoneVerificationRequired ? "contact-verification-required" : "application";
        if (phase === "application") {
          const result = await send({ endpoint: "permissions", accessToken: credentials.accessToken }, options.signal);
          if (!active() || result.status !== "success") return { status: "unavailable" };
          const permissions = myPermissionsSchema.safeParse(result.data);
          if (!permissions.success || permissions.data.subjectType !== credentials.subjectType
            || projectPermissionsDto(permissions.data, credentials.accountId).status !== "projected") {
            return { status: "unavailable" };
          }
        }
        const id = createSessionId();
        candidateHash = id.idHash;
        const context = {
          idHash: id.idHash,
          identity: { accountId: identity.data.accountId, backendSessionId: identity.data.sessionId,
            subjectType: identity.data.subjectType },
          phase, accessExpiresAtMs: lifetime.accessExpiresAtMs,
          refreshExpiresAtMs: lifetime.refreshExpiresAtMs, expiresAtMs: lifetime.expiresAtMs,
        };
        const protectedResult = await protector.protect({
          accessToken: credentials.accessToken, refreshToken: credentials.refreshToken,
        }, context);
        if (!active() || protectedResult.status !== "protected" || checkAccessBoundExpiry(context, clock).status !== "active") {
          return { status: "unavailable" };
        }
        const draft: NewSession = { ...context, protectedTokens: protectedResult.protectedTokens };
        candidateSeal = draft.protectedTokens.sealed;
        const created = await store.create(draft);
        if (created.status !== "created") return { status: "unavailable" };
        if (!active() || checkAccessBoundExpiry(created.session, clock).status !== "active") return { status: "unavailable" };
        const cookie = cookies.cookies.issue(id.sid);
        if (cookie.status !== "prepared") return { status: "unavailable" };
        const delivery = createPendingLoginDelivery(cookie.cookie,
          () => active() && checkAccessBoundExpiry(created.session, clock).status === "active", cleanup);
        completed = true;
        return Object.freeze({ status: "created", phase, ...delivery });
      } catch {
        return { status: "unavailable" };
      } finally {
        if (!completed) {
          await cleanup();
        }
      }
    },
  });
}
