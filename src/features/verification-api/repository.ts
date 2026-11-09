import { AUTH_LOCK_NAME, bffFetch } from "@/features/auth/api/bff-fetch";
import { verificationResultSchema, type VerificationCommand, type VerificationResult } from "./contracts";
const unavailable = (): VerificationResult => ({ status: "error", uncertain: true });
export function createVerificationRepository() {
  return { async execute(command: VerificationCommand): Promise<VerificationResult> {
    if (!globalThis.isSecureContext || !navigator.locks) return { status: "error", code: "VERIFICATION_UNSUPPORTED", uncertain: false };
    try { return await navigator.locks.request(AUTH_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) return { status: "error", code: "VERIFICATION_BUSY", uncertain: false };
      try {
        // This tab holds the lock, so an expired access token is renewed without waiting for it.
        const response = await bffFetch("/api/verifications", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000),
          headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(command) }, { lockHeld: true });
        const result = verificationResultSchema.safeParse(await response.json());
        if (!result.success || (result.data.status === "error" ? response.status < 400 : response.status !== 200)) return command.op === "read" ? { status: "error", uncertain: false } : unavailable();
        return result.data;
      } catch { return command.op === "read" ? { status: "error", uncertain: false } : unavailable(); }
    }); } catch { return command.op === "read" ? { status: "error", uncertain: false } : unavailable(); }
  } };
}
