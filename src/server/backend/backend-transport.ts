import "server-only";
import { parseServerBackendConfig } from "../config/backend-config";
import { parseBffClientConfig } from "../config/bff-client-config";
import type { ClientMeta } from "./client-meta";
import { resolveBackendEndpoint } from "./backend-endpoint";
import { prepareBackendRequest } from "./backend-request";
import { readBackendResponse } from "./backend-response";
import type { BackendTransportResult } from "./backend-result";

export type BackendRequestOptions = Readonly<{ signal?: AbortSignal; client?: ClientMeta }>;

const BFF_SECRET_HEADER = "X-Bff-Secret";
const CLIENT_IP_HEADER = "X-Client-Ip";
const CLIENT_USER_AGENT_HEADER = "X-Client-User-Agent";

// Client metadata only travels with the shared secret; without it the API ignores it, so nothing is
// sent when no secret is configured.
export function createBffHeaders(environment: Readonly<Record<string, unknown>>) {
  const bff = parseBffClientConfig(environment);
  const secret = bff.status === "valid" ? bff.config.secret : undefined;
  return (client: ClientMeta | undefined): Readonly<Record<string, string>> => {
    if (secret === undefined || !client) return {};
    return {
      [BFF_SECRET_HEADER]: secret,
      ...(client.ip ? { [CLIENT_IP_HEADER]: client.ip } : {}),
      ...(client.userAgent ? { [CLIENT_USER_AGENT_HEADER]: client.userAgent } : {}),
    };
  };
}

// Environment is injected by a future server composition, never read at import.
// The fetch seam is trusted server/test code, not a client-supplied RequestInit.
export function createBackendTransport(environment: Readonly<Record<string, unknown>>, fetcher: typeof fetch = fetch) {
  const parsed = parseServerBackendConfig(environment);
  const bffHeaders = createBffHeaders(environment);
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
        const headers = { ...request.headers, ...bffHeaders(options.client) };
        const response = await fetcher(target.target.url, {
          method: target.target.method, headers, body: request.body,
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
