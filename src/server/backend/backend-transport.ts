import "server-only";
import { parseServerBackendConfig } from "../config/backend-config";
import { resolveBackendEndpoint } from "./backend-endpoint";
import { prepareBackendRequest } from "./backend-request";
import { readBackendResponse } from "./backend-response";
import type { BackendTransportResult } from "./backend-result";

export type BackendRequestOptions = Readonly<{ signal?: AbortSignal }>;

// Environment is injected by a future server composition, never read at import.
// The fetch seam is trusted server/test code, not a client-supplied RequestInit.
export function createBackendTransport(environment: Readonly<Record<string, unknown>>, fetcher: typeof fetch = fetch) {
  const parsed = parseServerBackendConfig(environment);
  return Object.freeze({
    async request(input: unknown, options: BackendRequestOptions = {}): Promise<BackendTransportResult> {
      if (parsed.status !== "valid") return { status: "invalid-config" };
      const config = parsed.config;
      if (config.source === "mock") return { status: "disabled" };
      // Serialize synchronously before the first await so later caller mutation
      // cannot change the endpoint, token, or body of an in-flight operation.
      const request = prepareBackendRequest(input);
      if (!request) return { status: "invalid-request" };
      const target = resolveBackendEndpoint(config, request.endpoint, request.parameters);
      if (target.status !== "resolved") return { status: "invalid-request" };
      const signal = options.signal;
      if (signal?.aborted) return { status: "unavailable" };
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.timeoutMs);
      try {
        const response = await fetcher(target.target.url, {
          method: target.target.method, headers: request.headers, body: request.body,
          credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal,
        });
        const result = await readBackendResponse(response, request.endpoint);
        return signal?.aborted ? { status: "unavailable" }
          : timedOut ? { status: "timeout" } : result;
      } catch {
        // No thrown upstream error/cause, URL, credentials, retry or refresh.
        return { status: !signal?.aborted && timedOut ? "timeout" : "unavailable" };
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    },
  });
}
