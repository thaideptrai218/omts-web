import {
  AUTH_REJECTION_BEFORE_EXECUTION, AUTH_REJECTION_HEADER, AUTH_REJECTION_RELOAD_REQUIRED, DISPLAYED_ACCOUNT_HEADER,
} from "@/shared/http/session-headers";
import { readDisplayedAccount } from "./displayed-account";

// Shared with login, logout and verification so a renewal never overlaps a sign-in or sign-out.
export const AUTH_LOCK_NAME = "omts-auth-lifecycle-v1";

type RenewResult = "renewed" | "expired" | "reload" | "unavailable";
let renewing: Promise<RenewResult> | undefined;
let reloading = false;

export function withDisplayedAccount(init: RequestInit = {}): RequestInit {
  const account = readDisplayedAccount();
  if (!account) return init;
  const headers = new Headers(init.headers);
  headers.set(DISPLAYED_ACCOUNT_HEADER, account);
  return { ...init, headers };
}

function reloadPage(): void {
  if (reloading) return;
  reloading = true;
  window.location.reload();
}

async function renewRequest(): Promise<RenewResult> {
  try {
    const response = await fetch("/api/auth/refresh", withDisplayedAccount({
      method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { "X-OMTS-Request": "web" }, signal: AbortSignal.timeout(30_000),
    }));
    if (response.status === 200) return "renewed";
    if (response.status === 409) return "reload";
    return response.status === 401 ? "expired" : "unavailable";
  } catch { return "unavailable"; }
}

// One renewal per tab however many requests hit the expiry together, and one per browser at a time
// through the Web Lock. A caller that already holds the lock renews directly and never joins the
// shared flight, which could be waiting on that very lock.
function renew(lockHeld: boolean): Promise<RenewResult> {
  if (lockHeld) return renewRequest();
  renewing ??= (async () => {
    try {
      return globalThis.navigator?.locks ? await navigator.locks.request(AUTH_LOCK_NAME, renewRequest) : await renewRequest();
    } finally { renewing = undefined; }
  })();
  return renewing;
}

function replayable(body: BodyInit | null | undefined): boolean {
  return body === undefined || body === null || typeof body === "string" || body instanceof FormData
    || body instanceof URLSearchParams || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
}

/**
 * fetch for same-origin BFF routes. It sends the displayed account, reloads the page when the BFF says
 * another tab changed the signed-in account, and renews an expired access token once before retrying.
 * Reads retry after any 401. Writes retry only when the BFF marks the 401 as raised before it executed
 * anything; every other write keeps its uncertain outcome for the caller to report.
 */
export async function bffFetch(input: string, init: RequestInit = {}, options: Readonly<{ lockHeld?: boolean }> = {}): Promise<Response> {
  return bffFetchRequest(input, init, options);
}

async function bffFetchRequest(input: string, init: RequestInit, options: Readonly<{ lockHeld?: boolean }>): Promise<Response> {
  const send = () => fetch(input, withDisplayedAccount(init));
  const response = await send();
  if (response.status === 409 && response.headers.get(AUTH_REJECTION_HEADER) === AUTH_REJECTION_RELOAD_REQUIRED) {
    reloadPage();
    return response;
  }
  if (response.status !== 401) return response;
  const method = (init.method ?? "GET").toUpperCase();
  const rejectedBeforeExecution = response.headers.get(AUTH_REJECTION_HEADER) === AUTH_REJECTION_BEFORE_EXECUTION;
  if (!(method === "GET" || method === "HEAD" || rejectedBeforeExecution) || !replayable(init.body) || init.signal?.aborted) return response;
  const renewed = await renew(options.lockHeld === true);
  if (renewed === "reload") { reloadPage(); return response; }
  if (renewed !== "renewed" || init.signal?.aborted) return response;
  return send();
}
