import "server-only";
import { farmingZoneListQuerySchema } from "@/features/farming-zones/api/farming-zone-read-request";
import { mapFarmingZoneListSuccess } from "@/features/farming-zones/api/map-farming-zone-read";
import { parseServerBackendConfig } from "../config/backend-config";
import { projectBackendDiagnostic } from "../backend/backend-diagnostic";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequestOptions } from "../backend/backend-transport";
import type { ServerSessionResolution } from "../auth/server-session-resolver";
import { resolveEmployeeSession, sameEmployeeSession } from "../employees/employee-session";

type Dependencies = Readonly<{
  resolve(cookieHeader: unknown): Promise<ServerSessionResolution>;
  backend: Readonly<{ request(input: BackendRequest, options?: BackendRequestOptions): Promise<BackendTransportResult> }>;
}>;

// Read-only, unmounted preparation. The backend filters zone scope; the BFF
// rechecks the session before publishing any result from the upstream call.
export function createFarmingZoneReadAdapter(environment: Readonly<Record<string, unknown>>, dependencies: Dependencies) {
  const config = parseServerBackendConfig(environment);
  return Object.freeze({
    async list(request: Request) {
      if (config.status !== "valid") return { status: "unavailable" } as const;
      if (config.config.source !== "api") return { status: "disabled" } as const;
      if (request.method !== "GET") return { status: "rejected", httpStatus: 405 } as const;
      if (request.signal.aborted) return { status: "unavailable" } as const;
      const params = new URL(request.url).searchParams;
      const keys = [...params.keys()];
      if (keys.some((key) => !["search", "statusId", "page", "pageSize"].includes(key))
        || new Set(keys).size !== keys.length) {
        return { status: "invalid-input" } as const;
      }
      const parsed = farmingZoneListQuerySchema.safeParse({
        ...(params.has("search") ? { search: params.get("search") } : {}),
        ...(params.has("statusId") ? { statusId: Number(params.get("statusId")) } : {}),
        page: Number(params.get("page") ?? "1"),
        pageSize: Number(params.get("pageSize") ?? "20"),
      });
      if (!parsed.success) return { status: "invalid-input" } as const;
      const cookie = request.headers.get("cookie");
      const initial = await resolveEmployeeSession(dependencies, cookie);
      if (initial.status !== "granted") return initial;
      if (request.signal.aborted) return { status: "unavailable" } as const;
      let upstream: BackendTransportResult;
      try {
        upstream = await dependencies.backend.request({
          endpoint: "farmingZoneList", query: parsed.data,
          accessToken: initial.session.readAccessTokenForBackend(),
        }, { signal: request.signal });
      } catch { upstream = { status: "unavailable" }; }
      const current = await resolveEmployeeSession(dependencies, cookie);
      if (current.status === "unavailable") return { status: "unavailable" } as const;
      if (current.status !== "granted" || !sameEmployeeSession(initial.session, current.session)) {
        return { status: "session-changed" } as const;
      }
      if (request.signal.aborted) return { status: "unavailable" } as const;
      if (upstream.status !== "success") return {
        status: "backend-failure" as const,
        diagnostic: projectBackendDiagnostic("farmingZoneList", upstream),
        ...(upstream.status === "http-error" && upstream.code ? { code: upstream.code } : {}),
      };
      return mapFarmingZoneListSuccess(upstream.httpStatus, upstream.data);
    },
  });
}
