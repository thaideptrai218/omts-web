import { z } from "zod";
import { banksSchema, receivingAccountSchema, saveReceivingAccountSchema } from "./contracts";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
async function send<T>(schema: z.ZodType<T>, banks: boolean, signal?: AbortSignal, body?: z.infer<typeof saveReceivingAccountSchema>): Promise<WorkspaceResult<T>> {
  try {
    const response = await fetch(`/api/receiving-bank-account${banks ? "?banks=1" : ""}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal: signal ?? AbortSignal.timeout(30000), headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json", "X-OMTS-Request": "web" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const value = await response.json();
    const parsed = response.ok && value.status === "success" ? schema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data } : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, uncertain: !!body && (response.ok || response.status === 401 || response.status >= 500) };
  } catch { return { status: "error", httpStatus: 0, uncertain: !!body }; }
}
export const readBanks = (signal: AbortSignal) => send(banksSchema, true, signal);
export const readReceivingAccount = (signal: AbortSignal) => send(receivingAccountSchema, false, signal);
export const saveReceivingAccount = (body: z.infer<typeof saveReceivingAccountSchema>) => send(receivingAccountSchema, false, undefined, body);
