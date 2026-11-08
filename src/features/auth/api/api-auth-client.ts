import { z } from "zod";
import { createBffSessionReader } from "./bff-session-reader";

const destination = z.enum(["/login", "/dashboard", "/onboarding/password", "/onboarding/contact"]);
const responseSchema = z.object({ status: z.enum(["ready", "active", "created", "signed-out", "cleared", "rejected", "pending", "reset-required", "invalid-input", "unavailable"]),
  destination: destination.optional(), code: z.string().optional(), revision: z.uuid().optional() });
export type ApiAuthResult = z.infer<typeof responseSchema> | Readonly<{ status: "unsupported" | "waited"; destination?: z.infer<typeof destination> }>;

export async function postAuth(operation: "bootstrap" | "login" | "logout" | "password" | "session/recover", body?: unknown): Promise<ApiAuthResult> {
  try {
    const response = await fetch(`/api/auth/${operation}`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { "X-OMTS-Request": "web", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60_000) });
    const parsed = responseSchema.safeParse(await response.json());
    if (parsed.success) {
      const status = parsed.data.status;
      const valid = ["ready", "active", "created", "signed-out", "cleared"].includes(status) ? response.status === 200
        : status === "rejected" ? response.status >= 400 && response.status < 500
          : status === "pending" || status === "reset-required" ? response.status === 409
            : status === "invalid-input" ? response.status === 400 : response.status === 503;
      if (!valid) return { status: "unavailable" };
    }
    if (parsed.success && ["created", "signed-out", "cleared"].includes(parsed.data.status) && globalThis.BroadcastChannel) {
      const channel = new BroadcastChannel("omts-auth-lifecycle-v1"); channel.postMessage("changed"); channel.close();
    }
    return parsed.success ? parsed.data : { status: "unavailable" };
  } catch { return { status: "unavailable" }; }
}

// A caller that waited rechecks the session, and never sends retained credentials.
export async function withAuthLock(action: () => Promise<ApiAuthResult>): Promise<ApiAuthResult> {
  if (!globalThis.isSecureContext || !navigator.locks) return { status: "unsupported" };
  return navigator.locks.request("omts-auth-lifecycle-v1", { ifAvailable: true }, async (lock) => {
    if (lock) return action();
    return navigator.locks.request("omts-auth-lifecycle-v1", async () => {
      const state = await createBffSessionReader().read();
      const path = state.status === "authenticated" ? "/dashboard"
        : state.status === "onboarding-required" ? state.destination : undefined;
      return { status: "waited", destination: path };
    });
  });
}

export async function loginWithApi(input: { identifier: string; password: string }): Promise<ApiAuthResult> {
  return withAuthLock(async () => {
    const bootstrap = await postAuth("bootstrap");
    if (bootstrap.status !== "ready") return bootstrap;
    const result = await postAuth("login", input);
    if (result.status !== "unavailable") return result;
    const current = await createBffSessionReader().read();
    if (current.status === "authenticated") return { status: "active", destination: "/dashboard" };
    if (current.status === "onboarding-required") return { status: "active", destination: current.destination };
    return { status: "unavailable" };
  });
}

export async function logoutWithApi(): Promise<ApiAuthResult> {
  return withAuthLock(async () => {
    const current = await postAuth("bootstrap");
    if (current.status === "unavailable") return current;
    return postAuth("logout", { expectedRevision: "revision" in current ? current.revision : undefined });
  });
}
