import "server-only";
import { z } from "zod";
import { authTokensSchema, loginRequestSchema } from "@/features/auth/api/auth-contract.schemas";
import { currentPasswordChangeSchema } from "@/features/account-security/schemas/change-password-schema";
import type { MessageCode } from "@/shared/messages/message-catalog";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";
import type { ClientMeta } from "../backend/client-meta";
import { createSessionCookieHelpers } from "./session-cookies";
import { sessionDestination } from "./session-destinations";
import { sessionFromAccessToken } from "./server-session-resolver";
import { cookiesForTokens, createSessionRefresher } from "./session-refresh";
import { phaseFromTokenFlags, probeSessionPhase } from "./session-phase";

type BackendRequester = Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;

// `cookies` are Set-Cookie header values the Route Handler must put on its response.
export type AuthActionResult =
  // "signed-out-local": cookies are cleared on this device, but the API did not confirm the session ended.
  | Readonly<{ status: "created" | "active" | "signed-out" | "signed-out-local" | "cleared"; destination?: string; cookies?: readonly string[] }>
  | Readonly<{ status: "rejected"; code?: MessageCode; httpStatus: number }>
  // No usable session. `cookies` clears them when the API definitively refused the refresh token.
  | Readonly<{ status: "session-expired"; cookies?: readonly string[] }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "invalid-input" }>;

const unavailable = Object.freeze({ status: "unavailable" } as const);

export function createAuthActions(dependencies: Readonly<{
  environment: Readonly<Record<string, unknown>>;
  backend: BackendRequester;
  clock: () => number;
}>) {
  const { backend, clock } = dependencies;
  const parsed = createSessionCookieHelpers(dependencies.environment);
  const refresher = createSessionRefresher(dependencies);
  const cookies = parsed.status === "available" ? parsed.cookies : undefined;

  type Existing =
    | Readonly<{ status: "active"; destination: string; cookies: readonly string[] }>
    | Readonly<{ status: "unavailable" }>
    // No live session: there was none, or the API refused it.
    | Readonly<{ status: "none"; refused: boolean }>;

  // Decides whether a session exists from the API, never from a cookie that merely has not expired:
  // the access token is probed, and a missing or dead one gets one renewal attempt first.
  async function existingSession(header: unknown, client: ClientMeta): Promise<Existing> {
    if (!cookies) return unavailable;
    const access = cookies.readAccess(header);
    const session = access.status === "found" ? sessionFromAccessToken(access.value) : undefined;
    let refused = false;
    if (session && session.expiresAtMs > clock()) {
      const probe = await probeSessionPhase(backend, session.readAccessTokenForBackend(), client);
      if (probe.state === "live") return { status: "active", destination: sessionDestination(probe.phase), cookies: [] };
      if (probe.state === "unavailable") return unavailable;
      refused = true;
    }
    const renewed = await refresher.refresh(header, client);
    if (renewed.status === "refreshed") {
      return { status: "active", destination: sessionDestination(phaseFromTokenFlags(renewed.tokens)), cookies: renewed.cookies };
    }
    if (renewed.status === "unavailable") return unavailable;
    return { status: "none", refused: refused || renewed.status === "rejected" };
  }

  return Object.freeze({
    refresh: refresher.refresh,
    authenticate: refresher.authenticate,

    // `deviceId` is the browser's long-lived device cookie value; it only names the device on the API session.
    async login(header: unknown, input: unknown, client: ClientMeta, signal: AbortSignal, deviceId?: string): Promise<AuthActionResult> {
      if (!cookies || signal.aborted) return unavailable;
      const credentials = loginRequestSchema.safeParse({
        identifier: typeof input === "object" && input !== null && typeof (input as { identifier?: unknown }).identifier === "string"
          ? (input as { identifier: string }).identifier.trim() : undefined,
        password: typeof input === "object" && input !== null ? (input as { password?: unknown }).password : undefined,
        clientType: "Web",
        ...(deviceId ? { deviceId } : {}),
      });
      if (!credentials.success) return { status: "invalid-input" };
      const existing = await existingSession(header, client);
      if (existing.status === "active") return existing;
      if (existing.status === "unavailable") return unavailable;
      const response = await backend.request({ endpoint: "login", body: credentials.data }, { client, signal })
        .catch((): BackendTransportResult => ({ status: "unavailable" }));
      if (response.status === "http-error") {
        return response.httpStatus >= 400 && response.httpStatus < 500
          ? { status: "rejected", code: response.code, httpStatus: response.httpStatus } : unavailable;
      }
      if (response.status !== "success" || signal.aborted) return unavailable;
      const tokens = authTokensSchema.safeParse(response.data);
      const set = tokens.success && sessionFromAccessToken(tokens.data.accessToken) ? cookiesForTokens(cookies, tokens.data, clock()) : undefined;
      if (!tokens.success || !set) return unavailable;
      return { status: "created", destination: sessionDestination(phaseFromTokenFlags(tokens.data)), cookies: set };
    },

    // Always ends with both cookies cleared. The API session is revoked whenever a token that can
    // reach it exists, including one renewed first because the access cookie had already lapsed.
    async logout(header: unknown, client: ClientMeta): Promise<AuthActionResult> {
      if (!cookies) return unavailable;
      const auth = await refresher.authenticate(header, client);
      // A session the API already refuses, or none at all, leaves nothing to revoke. Only an unreachable API
      // or a failed revoke leaves the session possibly alive there.
      let confirmed = auth.status !== "unavailable";
      if (auth.status === "ready") {
        const response = await backend.request({ endpoint: "logout", accessToken: auth.session.readAccessTokenForBackend() }, { client })
          .catch((): BackendTransportResult => ({ status: "unavailable" }));
        confirmed = response.status === "success" || (response.status === "http-error" && response.httpStatus === 401);
      }
      return { status: confirmed ? "signed-out" : "signed-out-local", destination: "/login", cookies: cookies.clear() };
    },

    async recover(header: unknown, client: ClientMeta): Promise<AuthActionResult> {
      if (!cookies) return unavailable;
      const existing = await existingSession(header, client);
      if (existing.status === "active") return existing;
      if (existing.status === "unavailable") return unavailable;
      return { status: "cleared", destination: "/login", cookies: cookies.clear() };
    },

    async changePassword(header: unknown, input: unknown, client: ClientMeta, signal: AbortSignal): Promise<AuthActionResult> {
      if (!cookies || signal.aborted) return unavailable;
      const values = currentPasswordChangeSchema.safeParse(input);
      if (!values.success) return { status: "invalid-input" };
      const auth = await refresher.authenticate(header, client);
      if (auth.status === "unavailable") return unavailable;
      if (auth.status !== "ready") return { status: "session-expired", ...(auth.status === "rejected" ? { cookies: cookies.clear() } : {}) };
      const response = await backend.request({
        endpoint: "passwordChange", accessToken: auth.session.readAccessTokenForBackend(),
        body: {
          currentPassword: values.data.currentPassword,
          newPassword: values.data.newPassword, passwordConfirmation: values.data.confirmPassword, clientType: "Web",
        },
      }, { client, signal }).catch((): BackendTransportResult => ({ status: "unavailable" }));
      if (response.status === "http-error" && response.httpStatus < 500) {
        return { status: "rejected", code: response.code, httpStatus: response.httpStatus };
      }
      const payload = response.status === "success" ? z.object({ tokens: authTokensSchema }).safeParse(response.data) : undefined;
      const tokens = payload?.success ? payload.data.tokens : undefined;
      const fresh = tokens ? sessionFromAccessToken(tokens.accessToken) : undefined;
      if (!tokens || !fresh || tokens.accountId.toLowerCase() !== auth.session.identity.accountId.toLowerCase()
        || tokens.subjectType !== auth.session.identity.subjectType || signal.aborted) return unavailable;
      const set = cookiesForTokens(cookies, tokens, clock());
      return set ? { status: "created", destination: sessionDestination(phaseFromTokenFlags(tokens)), cookies: set } : unavailable;
    },
  });
}

export type AuthActions = ReturnType<typeof createAuthActions>;
