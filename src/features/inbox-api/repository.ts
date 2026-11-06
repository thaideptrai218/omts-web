import { z } from "zod";
import { inboxSchema, inboxCommandSchema, openedNotificationSchema } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
async function send<T>(schema: z.ZodType<T>, page?: number, command?: z.infer<typeof inboxCommandSchema>, signal?: AbortSignal, openingId?: string, unreadOnly = false): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/inbox${openingId ? `?open=${encodeURIComponent(openingId)}` : command ? "" : `?page=${page ?? 1}&unreadOnly=${unreadOnly}`}`, { method: command ? "POST" : "GET", cache: "no-store", redirect: "error", credentials: "same-origin", signal: signal ?? AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", ...(command ? { "Content-Type": "application/json", "X-OMTS-Request": "web" } : {}) }, body: command ? JSON.stringify(command) : undefined });
    const value = await response.json(), parsed = response.ok && value.status === "success" ? schema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code,
      uncertain: !!command && (response.ok || response.status === 401 || response.status >= 500) };
  } catch { return { status: "error", httpStatus: 0, uncertain: !!command }; }
}
export const readInbox = (page: number, signal: AbortSignal, unreadOnly = false) => send(inboxSchema, page, undefined, signal, undefined, unreadOnly);
export const markInboxRead = async (command: z.infer<typeof inboxCommandSchema>) => {
  const result = await send(z.object({ saved: z.literal(true) }), undefined, command);
  if (result.status === "success") window.dispatchEvent(new Event("omts-inbox-changed"));
  return result;
};

export const openInboxRecord = (id: string, signal?: AbortSignal) => send(openedNotificationSchema, undefined, undefined, signal, id);
