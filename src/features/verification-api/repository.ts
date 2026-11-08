import { postAuth } from "@/features/auth/api/api-auth-client";
import { verificationResultSchema, type VerificationCommand, type VerificationResult } from "./contracts";
const unavailable = (): VerificationResult => ({ status: "error", uncertain: true });
export function createVerificationRepository() {
  return { async execute(command: VerificationCommand): Promise<VerificationResult> {
    if (!globalThis.isSecureContext || !navigator.locks) return { status: "error", code: "VERIFICATION_UNSUPPORTED", uncertain: false };
    try { return await navigator.locks.request("omts-auth-lifecycle-v1", { ifAvailable: true }, async (lock) => {
      if (!lock) return { status: "error", code: "VERIFICATION_BUSY", uncertain: false };
      try {
        if (command.op === "read" || command.op === "start") {
          const bootstrap = await postAuth("bootstrap");
          if (!["ready", "active"].includes(bootstrap.status)) return { status: "error", code: "VERIFICATION_SESSION", uncertain: false };
        }
        const response = await fetch("/api/verifications", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000),
          headers: { "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(command) });
        const result = verificationResultSchema.safeParse(await response.json());
        if (!result.success || (result.data.status === "error" ? response.status < 400 : response.status !== 200)) return command.op === "read" ? { status: "error", uncertain: false } : unavailable();
        if (result.data.status === "completed" && result.data.destination && globalThis.BroadcastChannel) {
          const channel = new BroadcastChannel("omts-auth-lifecycle-v1"); channel.postMessage("changed"); channel.close();
        }
        return result.data;
      } catch { return command.op === "read" ? { status: "error", uncertain: false } : unavailable(); }
    }); } catch { return command.op === "read" ? { status: "error", uncertain: false } : unavailable(); }
  } };
}
