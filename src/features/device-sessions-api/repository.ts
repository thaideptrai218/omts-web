import { z } from "zod";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import {
  deviceListSchema, revokeDeviceResultSchema, revokeOthersResultSchema, type RevokeDeviceRequest,
} from "./contracts";

async function send<T>(path: string, schema: z.ZodType<T>, method: "GET" | "POST", body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  const writing = method === "POST";
  try {
    const response = await bffFetch(path, { method, credentials: "same-origin", redirect: "error", cache: "no-store", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(writing ? { "X-OMTS-Request": "web" } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (response.status === 200 && result.status === "success") {
      const parsed = schema.safeParse(result.data);
      if (parsed.success) return { status: "success", data: parsed.data };
    }
    return { status: "error", httpStatus: response.status, code: typeof result.code === "string" ? result.code : undefined,
      uncertain: writing && (response.status >= 500 || response.ok || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: writing }; }
}

export function createDeviceSessionsRepository() {
  return {
    devices: (signal?: AbortSignal) => send("/api/account/devices", deviceListSchema, "GET", undefined, signal),
    revoke: (request: RevokeDeviceRequest) => send("/api/account/devices/revoke", revokeDeviceResultSchema, "POST", request),
    revokeOthers: () => send("/api/account/devices/revoke-others", revokeOthersResultSchema, "POST"),
  };
}
