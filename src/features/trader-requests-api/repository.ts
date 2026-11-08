import { z } from "zod";
import { traderRequestSchema, traderRequestsSchema, traderDecisionSchema } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
async function send<T>(schema: z.ZodType<T>, rejected: boolean, command?: z.infer<typeof traderDecisionSchema>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/trader-requests${command ? "" : `?rejected=${rejected}`}`, { method: command ? "POST" : "GET", cache: "no-store", redirect: "error", credentials: "same-origin", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(command ? { "Content-Type": "application/json", "X-OMTS-Request": "web" } : {}) }, body: command ? JSON.stringify(command) : undefined });
    const value = await response.json(), parsed = response.ok && value.status === "success" ? schema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code,
      uncertain: !!command && (response.ok || response.status === 401 || response.status >= 500) };
  } catch { return { status: "error", httpStatus: 0, uncertain: !!command }; }
}
export const readTraderRequests = (rejected: boolean, signal: AbortSignal) => send(traderRequestsSchema, rejected, undefined, signal);
export const decideTraderRequest = (command: z.infer<typeof traderDecisionSchema>) => send(traderRequestSchema, false, command);
