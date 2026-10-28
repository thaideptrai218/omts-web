import "server-only";
import { createSessionGateway } from "./session-gateway";
import { createServerSessionRuntimeOwner } from "./server-session-runtime-owner";
import { openApiSessionRuntime, type ApiSessionRuntime, type AuthActionResult } from "./api-session-runtime";
import { createBackendTransport } from "../backend/backend-transport";

export function createApiSessionGateway(environment: Readonly<Record<string, unknown>>) {
  const transport = createBackendTransport(environment);
  const owner = createServerSessionRuntimeOwner(() => openApiSessionRuntime(environment, transport));
  const reads = createSessionGateway(environment, () => owner.get(), transport);
  async function action(run: (runtime: ApiSessionRuntime) => Promise<AuthActionResult>) {
    if (reads.mode !== "api") return { status: "unavailable" as const };
    try {
      const opened = await owner.get();
      return opened.status === "ready" ? await run(opened.runtime) : { status: "unavailable" as const };
    } catch { return { status: "unavailable" as const }; }
  }
  return Object.freeze({
    ...reads,
    bootstrap: (header: string | null) => action((runtime) => runtime.bootstrap(header)),
    login: (header: string | null, input: unknown, signal: AbortSignal) => action((runtime) => runtime.login(header, input, signal)),
    logout: (header: string | null, expectedRevision?: string) => action((runtime) => runtime.logout(header, expectedRevision)),
    changePassword: (header: string | null, input: unknown, signal: AbortSignal) => action((runtime) => runtime.changePassword(header, input, signal)),
    dispose() { reads.dispose(); owner.dispose(); },
  });
}
