import { z } from "zod";
import { inboxSchema, inboxCommandSchema } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
async function send<T>(schema: z.ZodType<T>, page?: number, command?: z.infer<typeof inboxCommandSchema>, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/inbox${command ? "" : `?page=${page ?? 1}`}`, { method: command ? "POST" : "GET", cache: "no-store", redirect: "error", credentials: "same-origin", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(command ? { "Content-Type": "application/json", "X-OMTS-Request": "web" } : {}) }, body: command ? JSON.stringify(command) : undefined });
    const value = await response.json(), parsed = response.ok && value.status === "success" ? schema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code,
      uncertain: !!command && (response.ok || response.status === 401 || response.status >= 500) };
  } catch { return { status: "error", httpStatus: 0, uncertain: !!command }; }
}
export const readInbox = (page: number, signal: AbortSignal) => send(inboxSchema, page, undefined, signal);
export const markInboxRead = (command: z.infer<typeof inboxCommandSchema>) => send(z.object({ saved: z.literal(true) }), undefined, command);
