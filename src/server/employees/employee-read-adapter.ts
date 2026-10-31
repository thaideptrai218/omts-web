import "server-only";
import { employeeReadRequestSchema, parseEmployeeListSearchParams } from "@/features/employee-management/api/employee-read-request";
import { mapEmployeeReadSuccess } from "@/features/employee-management/api/map-employee-read-success";
import { parseServerBackendConfig } from "../config/backend-config";
import { projectBackendDiagnostic } from "../backend/backend-diagnostic";
import type { BackendTransportResult } from "../backend/backend-result";
import { resolveEmployeeSession, sameEmployeeSession, type EmployeeAdapterDependencies } from "./employee-session";

type ReadTarget = { endpoint: "employeeList" } | { endpoint: "employeeRead"; employeeId: unknown }
  | { endpoint: "employeeLinkableAccounts" };

function readInput(request: Request, target: ReadTarget) {
  const query = new URL(request.url).searchParams;
  if (target.endpoint === "employeeList") {
    const parsed = parseEmployeeListSearchParams(query);
    return parsed.status === "parsed" ? employeeReadRequestSchema.safeParse({ ...target, query: parsed.query }) : undefined;
  }
  return query.size === 0 ? employeeReadRequestSchema.safeParse(target) : undefined;
}

// GET-only, unmounted factory. No CSRF mutation policy, cookie writes, shared
// user-data cache, HTTP route, ambient env reads, retry or refresh.
export function createEmployeeReadAdapter(environment: Readonly<Record<string, unknown>>, dependencies: EmployeeAdapterDependencies) {
  const config = parseServerBackendConfig(environment);
  async function load(request: Request, target: ReadTarget) {
    if (config.status !== "valid") return { status: "unavailable" } as const;
    if (config.config.source !== "api") return { status: "disabled" } as const;
    if (request.method !== "GET") return { status: "rejected", httpStatus: 405 } as const;
    if (request.signal.aborted) return { status: "unavailable" } as const;
    const parsed = readInput(request, target);
    if (!parsed?.success) return { status: "invalid-input" } as const;
    const input = parsed.data;
    const cookie = request.headers.get("cookie");
    const initial = await resolveEmployeeSession(dependencies, cookie);
    if (initial.status !== "granted") return initial;
    if (initial.session.identity.subjectType !== "CooperativeOwner") return { status: "forbidden" } as const;
    if (request.signal.aborted) return { status: "unavailable" } as const;
    let upstream: BackendTransportResult;
    try {
      upstream = await dependencies.backend.request({ ...input, accessToken: initial.session.readAccessTokenForBackend() }, { signal: request.signal });
    } catch { upstream = { status: "unavailable" }; }
    const current = await resolveEmployeeSession(dependencies, cookie);
    if (current.status === "unavailable") return { status: "unavailable" } as const;
    if (current.status !== "granted" || !sameEmployeeSession(initial.session, current.session)) {
      return { status: "session-changed" } as const;
    }
    if (request.signal.aborted) return { status: "unavailable" } as const;
    if (upstream.status !== "success") return {
      status: "backend-failure" as const, diagnostic: projectBackendDiagnostic(input.endpoint, upstream),
      ...(upstream.status === "http-error" && upstream.code ? { code: upstream.code } : {}),
    };
    return mapEmployeeReadSuccess(input, upstream.httpStatus, upstream.data);
  }
  return Object.freeze({
    list: (request: Request) => load(request, { endpoint: "employeeList" }),
    detail: (request: Request, employeeId: unknown) => load(request, { endpoint: "employeeRead", employeeId }),
    linkableAccounts: (request: Request) => load(request, { endpoint: "employeeLinkableAccounts" }),
  });
}
