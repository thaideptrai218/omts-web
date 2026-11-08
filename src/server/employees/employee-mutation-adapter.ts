import "server-only";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { employeeUpdateRequestSchema } from "@/features/employee-management/api/employee-update.schema";
import { employeeRowVersionSchema } from "@/features/employee-management/schemas/employee-row-version";
import { mapEmployeeMutationSuccess } from "@/features/employee-management/api/map-employee-mutation-success";
import { mapEmployeeProblem } from "@/features/employee-management/api/map-employee-problem";
import { createCsrfGuard } from "../auth/csrf-guard";
import { parseServerBackendConfig } from "../config/backend-config";
import { projectBackendDiagnostic } from "../backend/backend-diagnostic";
import { MAX_REQUEST_BYTES } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import { resolveEmployeeSession, sameEmployeeSession, type EmployeeAdapterDependencies } from "./employee-session";

function mutationInput(request: Request, employeeId: string, body: unknown) {
  const query = new URL(request.url).searchParams;
  if (request.method === "PUT") {
    const parsed = employeeUpdateRequestSchema.safeParse(body);
    return parsed.success && query.size === 0
      ? { endpoint: "employeeUpdate" as const, employeeId, body: parsed.data } : undefined;
  }
  const versions = query.getAll("rowVersion");
  const version = employeeRowVersionSchema.safeParse(versions[0]);
  return query.size === 1 && versions.length === 1 && version.success
    ? { endpoint: "employeeUnlink" as const, employeeId, recordVersion: version.data } : undefined;
}

// Unmounted server factory, not a Route Handler or a browser repository.
// No ambient env reads, refresh, session/cookie writes, retry or mock fallback.
export function createEmployeeMutationAdapter(environment: Readonly<Record<string, unknown>>, dependencies: EmployeeAdapterDependencies) {
  const config = parseServerBackendConfig(environment);
  const csrf = createCsrfGuard(environment);

  return Object.freeze({
    async mutate(request: Request, employeeId: unknown) {
      if (config.status !== "valid" || csrf.status !== "available") return { status: "unavailable" } as const;
      if (config.config.source !== "api") return { status: "disabled" } as const;
      if (request.method !== "PUT" && request.method !== "DELETE") return { status: "rejected", httpStatus: 405 } as const;
      if (request.signal.aborted) return { status: "unavailable" } as const;
      const checked = await csrf.guard.check(request, request.method === "PUT"
        ? { method: "PUT", body: "json", maxBytes: MAX_REQUEST_BYTES, timeoutMs: 5000 }
        : { method: "DELETE", body: "none", timeoutMs: 5000 });
      if (checked.status !== "allowed") return checked;
      const id = apiIdSchema.safeParse(employeeId);
      if (!id.success) return { status: "invalid-input" } as const;
      const input = mutationInput(request, id.data, checked.body.readForValidation());
      if (!input) return { status: "invalid-input" } as const;

      const cookie = request.headers.get("cookie");
      const initial = await resolveEmployeeSession(dependencies, cookie);
      if (initial.status !== "granted") return initial;
      if (initial.session.identity.subjectType !== "CooperativeOwner") return { status: "forbidden" } as const;
      if (request.signal.aborted) return { status: "unavailable" } as const;
      let upstream: BackendTransportResult;
      try {
        upstream = await dependencies.backend.request({ ...input,
          accessToken: initial.session.readAccessTokenForBackend(),
        }, { signal: request.signal });
      } catch { upstream = { status: "unavailable" }; }

      // A mutation may already have committed. A changed session discards its
      // result, never retries, never clears a newer browser cookie.
      const current = await resolveEmployeeSession(dependencies, cookie);
      if (current.status === "unavailable") return { status: "unavailable" } as const;
      if (current.status !== "granted" || !sameEmployeeSession(initial.session, current.session)) {
        return { status: "session-changed" } as const;
      }
      if (request.signal.aborted) return { status: "unavailable" } as const;
      if (upstream.status === "http-error" && upstream.code === "MSG06") {
        return { status: "contract-blocked", reason: "conflict-metadata", code: "MSG06" } as const;
      }
      if (upstream.status === "http-error") {
        const issue = mapEmployeeProblem(input.endpoint, upstream.httpStatus, upstream.code, upstream.employeeProblem);
        if (issue) return issue;
      }
      if (upstream.status !== "success") return {
        status: "backend-failure" as const,
        diagnostic: projectBackendDiagnostic(input.endpoint, upstream),
        ...(upstream.status === "http-error" && upstream.code ? { code: upstream.code } : {}),
      };
      const mapped = mapEmployeeMutationSuccess(request.method, upstream.httpStatus, upstream.data, id.data);
      return mapped.status === "mapped" ? { status: "saved" as const, employee: mapped.value } : mapped;
    },
  });
}
