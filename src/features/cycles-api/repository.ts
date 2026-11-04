import type { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
export async function readCycles<T>(query: Record<string,string>, schema: z.ZodType<T>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/cultivation-cycles?${new URLSearchParams(query)}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal: signal ?? AbortSignal.timeout(30_000) });
    const body = await response.json(), parsed = schema.safeParse(body.data);
    return response.ok && body.status === "success" && parsed.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.status, code: body.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
