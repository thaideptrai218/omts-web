import "server-only";
import { z } from "zod";
import type { ServerBackendConfig } from "@/server/config/backend-config";

export const backendEndpointSchema = z.enum(["login", "identity", "permissions", "profileRead", "profileUpdate", "logout"]);
type Endpoint = z.infer<typeof backendEndpointSchema>;
type Target = Readonly<{ url: string; method: "GET" | "POST" | "PUT" }>;
// Wire snapshot: backend develop@48ae1e0. Catalog is not authorization or feature activation.
const routes: Readonly<Record<Endpoint, Readonly<{ path: string; method: Target["method"] }>>> = {
  login: { path: "/api/auth/login", method: "POST" },
  identity: { path: "/api/me", method: "GET" },
  permissions: { path: "/api/me/permissions", method: "GET" },
  profileRead: { path: "/api/me/profile", method: "GET" },
  profileUpdate: { path: "/api/me/profile", method: "PUT" },
  logout: { path: "/api/auth/logout", method: "POST" },
};

export function resolveBackendEndpoint(config: ServerBackendConfig, endpoint: unknown):
  { status: "resolved"; target: Target } | { status: "disabled" | "invalid-target" } {
  if (config.source === "mock") return { status: "disabled" };
  const parsed = backendEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { status: "invalid-target" };
  const route = routes[parsed.data];
  try {
    const url = new URL(route.path, config.origin);
    if (url.origin !== config.origin) return { status: "invalid-target" };
    return { status: "resolved", target: Object.freeze({ url: url.href, method: route.method }) };
  } catch { return { status: "invalid-target" }; }
}
