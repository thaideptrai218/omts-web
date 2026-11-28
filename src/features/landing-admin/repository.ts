import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { landingSettingsSchema, type LandingSettings } from "./contracts";

/** Mỗi thao tác trả lại toàn bộ thiết lập mới nhất của trang giới thiệu. */
export async function landingRequest(action: "get" | "add" | "remove" | "example", input?: unknown, photo?: File, signal?: AbortSignal): Promise<WorkspaceResult<LandingSettings>> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    let body: BodyInit | undefined;
    if (action !== "get") {
      headers["X-OMTS-Request"] = "web";
      if (photo) { const form = new FormData(); form.set("payload", JSON.stringify(input)); form.append("photo", photo); body = form; }
      else { headers["Content-Type"] = "application/json"; body = JSON.stringify(input); }
    }
    const response = await bffFetch(`/api/cooperative/landing?action=${action}`, { method: action === "get" ? "GET" : "POST", body, headers, credentials: "same-origin", redirect: "error", cache: "no-store", signal: signal ?? AbortSignal.timeout(60_000) });
    const value = await response.json(), parsed = landingSettingsSchema.safeParse(value.data);
    return response.ok && value.status === "success" && parsed.success
      ? { status: "success", data: parsed.data }
      : { status: "error", code: value.code, httpStatus: response.status, uncertain: action !== "get" && (response.ok || response.status >= 500 || response.status === 401) };
  } catch { return { status: "error", httpStatus: 0, uncertain: action !== "get" }; }
}
