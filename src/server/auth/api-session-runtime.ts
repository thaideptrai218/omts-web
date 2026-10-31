import "server-only";
import { z } from "zod";
import { parseServerSessionRuntimeConfig } from "./server-session-runtime-config";
import { connectSessionRedis } from "./session-redis-client";
import { createRedisSessionStore } from "./redis-session-store";
import { createSessionTokenProtector } from "./session-token-protector";
import { createServerSessionResolver, type ServerSessionResolution } from "./server-session-resolver";
import { createSessionCookieHelpers } from "./session-cookies";
import { createAuthContextCookieHelpers } from "./auth-context-cookie";
import { createRedisLoginLedger, loginBinding } from "./redis-login-ledger";
import { createLoginSessionService } from "./login-session-service";
import { guardApplicationSession } from "./application-session-guard";
import { sessionDestination } from "./session-destinations";
import { createBackendTransport } from "../backend/backend-transport";
import type { ServerSessionReadRuntime, ServerSessionRuntimeOpenResult } from "./server-session-runtime";
import { authTokensSchema } from "@/features/auth/api/auth-contract.schemas";
import { currentPasswordChangeSchema } from "@/features/account-security/schemas/change-password-schema";
import { newPasswordSchema } from "@/shared/security/new-password-schema";

const config = z.object({
  OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().min(60_000).max(86_400_000)),
  OMTS_WEB_AUTH_PENDING_TIMEOUT_MS: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().min(10_000).max(300_000)),
});
const unavailable = () => ({ status: "unavailable" as const });
type Cookie = { readForResponseHeader(): string };
export type AuthActionResult = (Readonly<{ status: "ready" | "created" | "active" | "signed-out"; destination?: string; cookie?: Cookie; contextCookie?: Cookie }>
  | Readonly<{ status: "rejected"; code?: string; httpStatus: number }>
  | { [Status in "unavailable" | "pending" | "reset-required" | "invalid-input"]: Readonly<{ status: Status }> }["unavailable" | "pending" | "reset-required" | "invalid-input"]) & Readonly<{ revision?: string }>;
export type ApiSessionRuntime = ServerSessionReadRuntime & Readonly<{
  bootstrap(header: string | null): Promise<AuthActionResult>;
  login(header: string | null, input: unknown, signal: AbortSignal): Promise<AuthActionResult>;
  logout(header: string | null, expectedRevision?: string): Promise<AuthActionResult>;
  changePassword(header: string | null, input: unknown, signal: AbortSignal, verificationProof?: string): Promise<AuthActionResult>;
}>;

export async function openApiSessionRuntime(environment: Readonly<Record<string, unknown>>,
  backend = createBackendTransport(environment)): Promise<ServerSessionRuntimeOpenResult<ApiSessionRuntime>> {
  const parsed = parseServerSessionRuntimeConfig(environment);
  const policy = config.safeParse(environment);
  const sessionCookies = createSessionCookieHelpers(environment);
  const contexts = createAuthContextCookieHelpers(environment);
  if (parsed.status !== "valid") return parsed;
  if (!policy.success || sessionCookies.status !== "available" || contexts.status !== "available"
    || policy.data.OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS <= policy.data.OMTS_WEB_AUTH_PENDING_TIMEOUT_MS) {
    return { status: "invalid-config", fields: ["OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS", "OMTS_WEB_AUTH_PENDING_TIMEOUT_MS"] };
  }
  const { url, connectTimeoutMs, commandTimeoutMs } = parsed.config.redis;
  const connected = await connectSessionRedis({ url, connectTimeoutMs, commandTimeoutMs });
  if (connected.status !== "connected") return unavailable();
  const connection = connected.connection;
  const contextCookies = contexts.cookies;
  const store = createRedisSessionStore(connection.commands, parsed.config.redis.namespace);
  const ledger = createRedisLoginLedger(connection.commands, parsed.config.redis.namespace);
  const protector = createSessionTokenProtector(parsed.config.keys);
  const resolver = createServerSessionResolver({ cookieReader: sessionCookies.cookies, store, tokenOpener: protector, clock: Date.now });
  const service = createLoginSessionService({ environment, backend, store, protector, clock: Date.now });
  let closed = false;

  async function resolve(header: unknown): Promise<ServerSessionResolution> {
    if (closed) return unavailable();
    const initial = await resolver.resolve(header);
    if (initial.status !== "resolved") return initial;
    const cookie = contextCookies.read(header);
    if (cookie.status !== "found") return { status: "invalid-session", reason: "invalid-cookie", clearCookie: true };
    const match = await ledger.matchBinding({ contextHash: cookie.contextHash,
      sessionHash: initial.session.readIdHashForSessionStore(), sessionRevision: initial.session.revision });
    if (closed || match.status === "unavailable") return unavailable();
    return match.status === "matched" ? initial : { status: "invalid-session", reason: "revoked", clearCookie: true };
  }

  const runtime: ApiSessionRuntime = {
    resolve,
    async resolveApplication(header) { return guardApplicationSession(await resolve(header)); },
    close() { closed = true; connection.close(); },
    async bootstrap(header) {
      if (closed) return unavailable();
      const session = await resolve(header);
      if (session.status === "unavailable") return unavailable();
      const cookie = contexts.cookies.read(header);
      if (cookie.status === "invalid-cookie") return { status: "reset-required" };
      if (cookie.status === "found") {
        const record = await ledger.read(cookie.contextHash);
        if (record.status === "unavailable") return unavailable();
        if (record.status === "found") {
          if (session.status === "resolved") return { status: "active", destination: sessionDestination(session.session.phase), revision: record.context.revision };
          const state = record.context.state.kind;
          if (session.status === "invalid-session") return { status: "reset-required", revision: record.context.revision };
          return { status: state === "idle" ? "ready" : state === "pending" ? "pending" : "reset-required", revision: record.context.revision };
        }
      }
      const fresh = contexts.cookies.createFresh();
      if (fresh.status !== "prepared") return unavailable();
      const created = await ledger.create(fresh.contextHash, Date.now() + policy.data.OMTS_WEB_AUTH_CONTEXT_IDLE_TTL_MS);
      if (closed || created.status !== "created") return unavailable();
      return { status: "ready", contextCookie: fresh.cookie };
    },
    async login(header, input, signal) {
      if (closed || signal.aborted) return unavailable();
      const current = await resolve(header);
      if (current.status === "resolved") return { status: "active", destination: sessionDestination(current.session.phase) };
      if (current.status === "unavailable") return unavailable();
      if (current.status === "invalid-session") return { status: "reset-required" };
      const cookie = contexts.cookies.read(header);
      if (cookie.status !== "found") return { status: "reset-required" };
      const record = await ledger.read(cookie.contextHash);
      if (record.status !== "found") return record.status === "unavailable" ? unavailable() : { status: "reset-required" };
      if (record.context.state.kind !== "idle") return { status: record.context.state.kind === "pending" ? "pending" : "reset-required" };
      const started = await ledger.begin({ contextHash: cookie.contextHash, expectedRevision: record.context.revision,
        pendingUntilMs: Math.min(record.context.expiresAtMs, Date.now() + policy.data.OMTS_WEB_AUTH_PENDING_TIMEOUT_MS) });
      if (started.status !== "started") return started.status === "unavailable" ? unavailable() : { status: "pending" };
      const result = await service.login(input, { signal, isCurrent: () => !closed });
      if (result.status !== "created") {
        await ledger.settle({ attempt: started.attempt, outcome: result.status === "rejected" || result.status === "invalid-input" ? "rejected" : "unknown" });
        return result.status === "rejected" ? { status: "rejected", code: result.code, httpStatus: result.httpStatus }
          : result.status === "invalid-input" ? { status: "invalid-input" } : unavailable();
      }
      if (!result.binding || closed || signal.aborted) { await result.abandon(); return unavailable(); }
      const published = await ledger.publish({ attempt: started.attempt, binding: result.binding });
      if (published.status !== "updated" || closed || signal.aborted) { await result.abandon(); return unavailable(); }
      return { status: "created", destination: sessionDestination(result.phase), cookie: result.cookie };
    },
    async logout(header, expectedRevision) {
      if (closed) return unavailable();
      const session = await resolver.resolve(header);
      const cookie = contexts.cookies.read(header);
      if (cookie.status === "found") {
        const record = await ledger.read(cookie.contextHash);
        if (record.status === "unavailable") return unavailable();
        if (record.status === "found" && record.context.state.kind !== "revoked") {
          if (record.context.revision !== expectedRevision) return { status: "reset-required" };
          if (session.status === "resolved" && record.context.state.kind === "active"
            && (record.context.state.binding.sessionHash !== session.session.readIdHashForSessionStore()
              || record.context.state.binding.sessionRevision !== session.session.revision)) return { status: "reset-required" };
          const invalidated = await ledger.invalidate({ contextHash: cookie.contextHash, expectedRevision: record.context.revision });
          if (invalidated.status !== "updated") return unavailable();
          if (record.context.state.kind === "active") await store.revoke(record.context.state.binding.sessionHash);
        }
      }
      if (session.status === "unavailable") return unavailable();
      if (session.status === "resolved") {
        const revoked = await store.revoke(loginBinding(session.session).sessionHash);
        if (revoked.status === "unavailable" || revoked.status === "invalid-input") return unavailable();
        await backend.request({ endpoint: "logout", accessToken: session.session.readAccessTokenForBackend() });
      }
      return { status: "signed-out", destination: "/login", cookie: sessionCookies.cookies.clear(), contextCookie: contexts.cookies.clear() };
    },
    async changePassword(header, input, signal, verificationProof) {
      // Proof is supplied only by the server verification flow, never the public password route.
      const values = (verificationProof ? newPasswordSchema : currentPasswordChangeSchema).safeParse(input);
      if (!values.success) return { status: "invalid-input" };
      const session = await resolve(header);
      if (session.status !== "resolved") return { status: "reset-required" };
      const contextCookie = contextCookies.read(header);
      if (contextCookie.status !== "found") return { status: "reset-required" };
      const record = await ledger.read(contextCookie.contextHash);
      if (record.status !== "found") return unavailable();
      const originalBinding = loginBinding(session.session);
      const reserved = await ledger.reserveActive({ contextHash: contextCookie.contextHash, expectedRevision: record.context.revision,
        pendingUntilMs: Math.min(record.context.expiresAtMs, Date.now() + policy.data.OMTS_WEB_AUTH_PENDING_TIMEOUT_MS), binding: originalBinding });
      if (reserved.status !== "started") return { status: "pending" };
      const response = await backend.request({ endpoint: "passwordChange", accessToken: session.session.readAccessTokenForBackend(),
        body: { ...(verificationProof ? { verificationToken: verificationProof } : { currentPassword: "currentPassword" in values.data ? values.data.currentPassword : undefined }), newPassword: values.data.newPassword,
          passwordConfirmation: values.data.confirmPassword, clientType: "Web" } }, { signal });
      if (response.status === "http-error" && response.httpStatus < 500) {
        await ledger.publish({ attempt: reserved.attempt, binding: originalBinding });
        return { status: "rejected", code: response.code, httpStatus: response.httpStatus };
      }
      const payload = response.status === "success" ? z.object({ tokens: authTokensSchema }).safeParse(response.data) : undefined;
      if (!payload?.success || payload.data.tokens.accountId !== session.session.identity.accountId
        || payload.data.tokens.subjectType !== session.session.identity.subjectType) {
        await ledger.settle({ attempt: reserved.attempt, outcome: "unknown" });
        await store.revoke(originalBinding.sessionHash);
        return unavailable();
      }
      const updated = await service.acceptTokens(payload.data.tokens, { signal, isCurrent: () => !closed });
      if (updated.status !== "created" || !updated.binding) {
        await ledger.settle({ attempt: reserved.attempt, outcome: "unknown" });
        await store.revoke(originalBinding.sessionHash);
        return unavailable();
      }
      const published = await ledger.publish({ attempt: reserved.attempt, binding: updated.binding });
      await store.revoke(originalBinding.sessionHash);
      if (published.status !== "updated" || closed || signal.aborted) { await updated.abandon(); return unavailable(); }
      return { status: "created", destination: sessionDestination(updated.phase), cookie: updated.cookie };
    },
  };
  return { status: "ready", runtime: Object.freeze(runtime) };
}
