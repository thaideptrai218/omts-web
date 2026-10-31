import "server-only";

import type {
  ServerSessionReadRuntime,
  ServerSessionRuntimeOpenResult,
} from "./server-session-runtime";

type RuntimeOpener<Runtime extends ServerSessionReadRuntime> = () => Promise<ServerSessionRuntimeOpenResult<Runtime>>;

export type ServerSessionRuntimeOwner<Runtime extends ServerSessionReadRuntime = ServerSessionReadRuntime> = Readonly<{
  get(): Promise<ServerSessionRuntimeOpenResult<Runtime>>;
  dispose(): void;
}>;

const unavailable = Object.freeze({ status: "unavailable" } as const);

function closeSafely(runtime: ServerSessionReadRuntime | undefined): void {
  try {
    runtime?.close();
  } catch {
    // Disposal must not expose connection/provider details or revive ownership.
  }
}

/**
 * Owns one ready runtime and shares one in-flight open operation. Failed opens
 * are not cached; late results after disposal are closed and never published.
 */
export function createServerSessionRuntimeOwner<Runtime extends ServerSessionReadRuntime>(
  open: RuntimeOpener<Runtime>,
): ServerSessionRuntimeOwner<Runtime> {
  let ready: Runtime | undefined;
  let pending: Promise<ServerSessionRuntimeOpenResult<Runtime>> | undefined;
  let generation = 0;

  return Object.freeze({
    get() {
      if (ready !== undefined) {
        return Promise.resolve(Object.freeze({ status: "ready", runtime: ready }));
      }
      if (pending !== undefined) return pending;

      const startedAtGeneration = generation;
      const opening = Promise.resolve()
        .then(open)
        .catch(() => unavailable)
        .then((result): ServerSessionRuntimeOpenResult<Runtime> => {
          if (generation !== startedAtGeneration) {
            if (result.status === "ready") closeSafely(result.runtime);
            return unavailable;
          }
          if (result.status === "ready") ready = result.runtime;
          return result;
        })
        .finally(() => {
          if (pending === opening) pending = undefined;
        });
      pending = opening;
      return opening;
    },
    dispose() {
      generation += 1;
      pending = undefined;
      const current = ready;
      ready = undefined;
      closeSafely(current);
    },
  });
}
