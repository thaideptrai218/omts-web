import type { z } from "zod";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { projectFarmingProblem } from "@/features/cultivation-api/farming-problem";
import { scanStartedSchema, scanStatusSchema, type ZoneBoundary } from "./boundary-contract";
import { boundarySavedSchema } from "./boundary-saved-contract";

async function send<T>(query: URLSearchParams, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const form = body instanceof FormData;
    const response = await bffFetch(`/api/operations/zone-boundary?${query}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "X-OMTS-Request": "web", ...(form ? {} : { "Content-Type": "application/json" }) }) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(60_000) });
    const value = await response.json(), parsed = schema.safeParse(value.data);
    if (response.ok && value.status === "success" && parsed.success) return { status: "success", data: parsed.data };
    const problem = projectFarmingProblem(value.problem);
    // A write whose answer is unusable may still have been applied: the caller reloads before it saves again.
    return { status: "error", httpStatus: response.ok ? 502 : response.status, code: typeof value.code === "string" ? value.code : undefined, ...(problem ? { problem } : {}),
      uncertain: body !== undefined && !form && (response.ok || response.status >= 500 || response.status === 401) };
  } catch (error) {
    // An aborted read is the caller leaving; it is not a failure to report.
    return { status: "error", httpStatus: 0, uncertain: body !== undefined && !(body instanceof FormData) && !(error instanceof DOMException && error.name === "AbortError") };
  }
}

/** The licence-map boundary of a zone through the BFF. The scan pair works without a zone (the create form) or bound to one; the read is a start then polls. */
export const zoneBoundaryRepository = {
  startScan(photo: File, zoneId?: string, signal?: AbortSignal) {
    const form = new FormData();
    form.set("payload", "{}");
    form.append("photo", photo, photo.name);
    return send(new URLSearchParams({ action: "boundary-scan", ...(zoneId ? { id: zoneId } : {}) }), scanStartedSchema, form, signal);
  },
  scanStatus(scanId: string, zoneId?: string, signal?: AbortSignal) {
    return send(new URLSearchParams({ action: "boundary-scan-status", scanId, ...(zoneId ? { id: zoneId } : {}) }), scanStatusSchema, undefined, signal);
  },
  /** `boundary: null` clears it. The answer is the zone with its new row version. */
  save(zoneId: string, boundary: ZoneBoundary | null, rowVersion: string) {
    return send(new URLSearchParams({ action: "boundary", id: zoneId }), boundarySavedSchema, { boundary, rowVersion });
  },
};
