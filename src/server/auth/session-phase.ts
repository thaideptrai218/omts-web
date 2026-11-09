import "server-only";
import { onboardingStateSchema } from "@/features/auth/api/auth-contract.schemas";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";
import type { ClientMeta } from "../backend/client-meta";
import type { SessionPhase } from "./session-destinations";

type BackendRequester = Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;

export type PhaseProbe =
  | Readonly<{ state: "live"; phase: SessionPhase }>
  // The API refused the access token: revoked, locked or expired. A cookie alone proves nothing.
  | Readonly<{ state: "dead" }>
  | Readonly<{ state: "unavailable" }>;

function phaseOf(requiresPhoneVerification: boolean, requiresPasswordChange: boolean): SessionPhase {
  // Same order as the API account-state gate: phone first, then the temporary password.
  return requiresPhoneVerification ? "contact-verification-required"
    : requiresPasswordChange ? "password-change-required" : "application";
}

/**
 * Asks the API where an access token stands. Nothing is stored: the phase is derived each time from the
 * onboarding flags of GET /api/me, which stays reachable while either step is pending.
 */
export async function probeSessionPhase(backend: BackendRequester, accessToken: string, client?: ClientMeta): Promise<PhaseProbe> {
  let result: BackendTransportResult;
  try { result = await backend.request({ endpoint: "identity", accessToken }, { client }); }
  catch { return { state: "unavailable" }; }
  if (result.status === "http-error") return result.httpStatus === 401 ? { state: "dead" } : { state: "unavailable" };
  if (result.status !== "success") return { state: "unavailable" };
  const parsed = onboardingStateSchema.safeParse(result.data);
  return parsed.success
    ? { state: "live", phase: phaseOf(parsed.data.phoneVerificationRequired, parsed.data.mustChangePassword) }
    : { state: "unavailable" };
}

export function phaseFromTokenFlags(tokens: Readonly<{ mustChangePassword: boolean; phoneVerificationRequired: boolean }>): SessionPhase {
  return phaseOf(tokens.phoneVerificationRequired, tokens.mustChangePassword);
}
