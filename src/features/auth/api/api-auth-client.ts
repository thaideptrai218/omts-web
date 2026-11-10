import { z } from "zod";
import { createBffSessionReader } from "./bff-session-reader";
import { AUTH_LOCK_NAME, withDisplayedAccount } from "./bff-fetch";

const destination = z.enum(["/login", "/dashboard", "/onboarding/password", "/onboarding/contact"]);
// Shown when this device is signed out but the API did not confirm that the session ended.
export const LOCAL_SIGN_OUT_MESSAGE = "Đã đăng xuất trên máy này, chưa xác nhận trên máy chủ.";
const responseSchema = z.object({ status: z.enum(["active", "created", "signed-out", "signed-out-local", "cleared", "rejected", "session-expired", "invalid-input", "unavailable", "reload-required"]),
  destination: destination.optional(), code: z.string().optional() });
export type ApiAuthResult = z.infer<typeof responseSchema> | Readonly<{ status: "unsupported" | "waited"; destination?: z.infer<typeof destination> }>;

export async function postAuth(operation: "login" | "logout" | "password" | "session/recover", body?: unknown): Promise<ApiAuthResult> {
  try {
    const response = await fetch(`/api/auth/${operation}`, withDisplayedAccount({ method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { "X-OMTS-Request": "web", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60_000) }));
    const parsed = responseSchema.safeParse(await response.json());
    if (parsed.success) {
      const status = parsed.data.status;
      const valid = ["active", "created", "signed-out", "signed-out-local", "cleared"].includes(status) ? response.status === 200
        : status === "rejected" ? response.status >= 400 && response.status < 500
          : status === "session-expired" ? response.status === 401
            : status === "reload-required" ? response.status === 409
              : status === "invalid-input" ? response.status === 400 : response.status === 503;
      if (!valid) return { status: "unavailable" };
    }
    // Another tab signed in as someone else: this page shows the wrong account and must not act.
    if (parsed.success && parsed.data.status === "reload-required") window.location.reload();
    if (parsed.success && ["created", "signed-out", "signed-out-local", "cleared"].includes(parsed.data.status) && globalThis.BroadcastChannel) {
      const channel = new BroadcastChannel("omts-auth-lifecycle-v1"); channel.postMessage("changed"); channel.close();
    }
    return parsed.success ? parsed.data : { status: "unavailable" };
  } catch { return { status: "unavailable" }; }
}

// A caller that waited rechecks the session, and never sends retained credentials.
export async function withAuthLock(action: () => Promise<ApiAuthResult>): Promise<ApiAuthResult> {
  if (!globalThis.isSecureContext || !navigator.locks) return { status: "unsupported" };
  return navigator.locks.request(AUTH_LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) return action();
    return navigator.locks.request(AUTH_LOCK_NAME, async () => {
      const state = await createBffSessionReader().read();
      const path = state.status === "authenticated" ? "/dashboard"
        : state.status === "onboarding-required" ? state.destination : undefined;
      return { status: "waited", destination: path };
    });
  });
}

export async function loginWithApi(input: { identifier: string; password: string }): Promise<ApiAuthResult> {
  return withAuthLock(async () => {
    const result = await postAuth("login", input);
    if (result.status !== "unavailable") return result;
    const current = await createBffSessionReader().read();
    if (current.status === "authenticated") return { status: "active", destination: "/dashboard" };
    if (current.status === "onboarding-required") return { status: "active", destination: current.destination };
    return { status: "unavailable" };
  });
}

export async function logoutWithApi(): Promise<ApiAuthResult> {
  return withAuthLock(() => postAuth("logout"));
}
