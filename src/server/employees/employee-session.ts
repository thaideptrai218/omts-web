import "server-only";
import { guardApplicationSession } from "../auth/application-session-guard";
import type { ResolvedServerSession, ServerSessionResolution } from "../auth/server-session-resolver";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";

export type EmployeeAdapterDependencies = Readonly<{
  resolve(cookieHeader: unknown): Promise<ServerSessionResolution>;
  backend: Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;
}>;

export async function resolveEmployeeSession(dependencies: Pick<EmployeeAdapterDependencies, "resolve">, cookie: string | null) {
  try { return guardApplicationSession(await dependencies.resolve(cookie)); }
  catch { return { status: "unavailable" } as const; }
}

export function sameEmployeeSession(first: ResolvedServerSession, current: ResolvedServerSession) {
  return current.phase === "application" && current.revision === first.revision
    && current.readIdHashForSessionStore() === first.readIdHashForSessionStore()
    && current.identity.accountId === first.identity.accountId
    && current.identity.backendSessionId === first.identity.backendSessionId
    && current.identity.subjectType === first.identity.subjectType;
}
