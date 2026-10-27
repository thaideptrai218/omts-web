import "server-only";
import { z } from "zod";
import type { ServerBackendConfig } from "@/server/config/backend-config";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { prepareEmployeeUnlinkRequest } from "@/features/employee-management/api/employee-mutation-request";
import { employeeListQuerySchema, prepareEmployeeReadRequest } from "@/features/employee-management/api/employee-read-request";

export const backendEndpointSchema = z.enum([
  "login", "identity", "permissions", "profileRead", "profileUpdate", "logout",
  "employeeUpdate", "employeeUnlink", "employeeList", "employeeRead", "employeeLinkableAccounts",
]);
type Endpoint = z.infer<typeof backendEndpointSchema>;
type Target = Readonly<{ url: string; method: "GET" | "POST" | "PUT" | "DELETE" }>;
// Wire snapshots: auth48ae1e0, employee953f597. Catalog is not authorization or feature activation.
type StaticEndpoint = Exclude<Endpoint, "employeeUpdate" | "employeeUnlink" | "employeeList" | "employeeRead">;
const routes: Readonly<Record<StaticEndpoint, Readonly<{ path: string; method: Target["method"] }>>> = {
  login: { path: "/api/auth/login", method: "POST" },
  identity: { path: "/api/me", method: "GET" },
  permissions: { path: "/api/me/permissions", method: "GET" },
  profileRead: { path: "/api/me/profile", method: "GET" },
  profileUpdate: { path: "/api/me/profile", method: "PUT" },
  logout: { path: "/api/auth/logout", method: "POST" },
  employeeLinkableAccounts: { path: "/api/employees/linkable-accounts", method: "GET" },
};

const employeeIdParameters = z.strictObject({ employeeId: apiIdSchema });
const employeeListParameters = z.strictObject({ query: employeeListQuerySchema });

function routeFor(endpoint: Endpoint, parameters: unknown) {
  if (endpoint === "employeeList") {
    const parsed = employeeListParameters.safeParse(parameters);
    if (!parsed.success) return undefined;
    const prepared = prepareEmployeeReadRequest({ endpoint, query: parsed.data.query });
    return prepared.status === "prepared" ? prepared.request : undefined;
  }
  if (endpoint === "employeeUpdate" || endpoint === "employeeRead") {
    const parsed = employeeIdParameters.safeParse(parameters);
    return parsed.success ? { path: `/api/employees/${parsed.data.employeeId}`, method: endpoint === "employeeUpdate" ? "PUT" as const : "GET" as const } : undefined;
  }
  if (endpoint === "employeeUnlink") {
    const prepared = prepareEmployeeUnlinkRequest(parameters);
    return prepared.status === "prepared" ? prepared.request : undefined;
  }
  return parameters === undefined ? routes[endpoint] : undefined;
}

export function resolveBackendEndpoint(config: ServerBackendConfig, endpoint: unknown, parameters?: unknown):
  { status: "resolved"; target: Target } | { status: "disabled" | "invalid-target" } {
  if (config.source === "mock") return { status: "disabled" };
  const parsed = backendEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { status: "invalid-target" };
  try {
    const route = routeFor(parsed.data, parameters);
    if (!route) return { status: "invalid-target" };
    const url = new URL(route.path, config.origin);
    if (url.origin !== config.origin) return { status: "invalid-target" };
    return { status: "resolved", target: Object.freeze({ url: url.href, method: route.method }) };
  } catch { return { status: "invalid-target" }; }
}
