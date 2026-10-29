import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { notificationCatalogSchema, notificationSavedSchema, profileViewSchema, type NotificationChange } from "./contracts";
async function send<T>(path: string, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  const writing = body !== undefined;
  try {
    const response = await fetch(path, { method: writing ? "PUT" : "GET", credentials: "same-origin", redirect: "error", cache: "no-store", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(writing ? { "X-OMTS-Request": "web", "Content-Type": "application/json" } : {}) }, body: writing ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (response.status === 200 && result.status === "success") { const parsed = schema.safeParse(result.data); if (parsed.success) return { status: "success", data: parsed.data }; }
    return { status: "error", httpStatus: response.status, code: typeof result.code === "string" ? result.code : undefined, uncertain: writing && (response.status >= 500 || response.ok || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: writing }; }
}
export function createPersonalRepository() {
  return { profile: (signal?: AbortSignal) => send("/api/account/profile", profileViewSchema, undefined, signal),
    saveProfile: (displayName: string, rowVersion: string) => send("/api/account/profile", profileViewSchema, { displayName, rowVersion }),
    notifications: (signal?: AbortSignal) => send("/api/account/notification-preferences", notificationCatalogSchema, undefined, signal),
    saveNotifications: (items: NotificationChange[]) => send("/api/account/notification-preferences", notificationSavedSchema, { items }) };
}
