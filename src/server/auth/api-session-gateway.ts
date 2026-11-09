import "server-only";
import { createSessionGateway } from "./session-gateway";
import { createAuthActions } from "./auth-actions";
import { createBackendTransport } from "../backend/backend-transport";
import { parseBffClientConfig } from "../config/bff-client-config";
import { readClientMeta } from "../backend/client-meta";

export function createApiSessionGateway(environment: Readonly<Record<string, unknown>>) {
  const transport = createBackendTransport(environment);
  const reads = createSessionGateway(environment, transport);
  const actions = createAuthActions({ environment, backend: transport, clock: Date.now });
  const bff = parseBffClientConfig(environment);
  const ipSource = bff.status === "valid" ? bff.config.ipSource : { kind: "none" } as const;
  return Object.freeze({
    ...reads,
    ...actions,
    // End-user address and browser of this request, from headers the deployment controls.
    clientMeta: (headers: Headers) => readClientMeta(headers, ipSource),
  });
}
