import { isJsonContentType } from "@/shared/http/api-problem";
import { parseBffSessionResponse, type BffSessionSnapshot } from "./bff-session.schema";

export type SessionReadOptions = Readonly<{
  signal?: AbortSignal;
  isCurrent?: () => boolean;
}>;
export type SessionReadResult = BffSessionSnapshot
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "stale" }>
  | Readonly<{ status: "invalid-response" }>;

// Dormant browser adapter: no imports from the current AuthProvider/service.
// Its only destination is the same-origin BFF, never the .NET API or a caller URL.
export function createBffSessionReader(fetcher: typeof fetch = fetch) {
  return Object.freeze({
    async read(options: SessionReadOptions = {}): Promise<SessionReadResult> {
      function callerState(): SessionReadResult | undefined {
        if (options.signal?.aborted) return { status: "cancelled" };
        try { if (!(options.isCurrent?.() ?? true)) return { status: "stale" }; }
        catch { return { status: "stale" }; }
      }
      const initial = callerState();
      if (initial) return initial;
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      options.signal?.addEventListener("abort", onAbort, { once: true });
      const deadline = setTimeout(onAbort, 5000);
      let rejectAbort!: () => void;
      const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = () => reject(new Error("SESSION_READ_STOPPED"));
      });
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
      const stopped = (): SessionReadResult | undefined => callerState()
        ?? (controller.signal.aborted ? { status: "unavailable" } : undefined);
      try {
        const response = await Promise.race([fetcher("/api/auth/session", {
          method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }, signal: controller.signal,
        }), aborted]);
        const afterFetch = stopped();
        if (afterFetch) return afterFetch;
        if (response.redirected || !isJsonContentType(response.headers.get("content-type"))) {
          return { status: "invalid-response" };
        }
        let body: unknown;
        try { body = await Promise.race([response.json(), aborted]); }
        catch { return stopped() ?? { status: "invalid-response" }; }
        return stopped() ?? parseBffSessionResponse(response.status, body);
      } catch {
        return stopped() ?? { status: "unavailable" };
      } finally {
        clearTimeout(deadline);
        options.signal?.removeEventListener("abort", onAbort);
        controller.signal.removeEventListener("abort", rejectAbort);
        controller.abort();
      }
    },
  });
}
