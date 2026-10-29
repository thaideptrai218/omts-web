import { z } from "zod";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { OperationArea } from "./permissions";
import { employeeProblemMetadataSchema } from "@/features/employee-management/api/employee-problem-metadata";
type RepositoryArea = OperationArea | "zone-licenses" | "raft-details" | "employees";

export type Query = Record<string, string | undefined>;
function queryString(input: Query) { return new URLSearchParams(Object.entries(input).filter((pair): pair is [string, string] => pair[1] !== undefined && pair[1] !== "")).toString(); }
async function send<T>(area: RepositoryArea, query: Query, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal): Promise<WorkspaceResult<T>> {
  try {
    const form = body instanceof FormData;
    const response = await fetch(`/api/operations/${area}?${queryString(query)}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", redirect: "error", cache: "no-store",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "X-OMTS-Request": "web", ...(form ? {} : { "Content-Type": "application/json" }) }) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(60_000) });
    const result = await response.json();
    if (response.status === 200 && result.status === "success") {
      const parsed = schema.safeParse(result.data);
      if (parsed.success) return { status: "success", data: parsed.data };
    }
    // Expiry may be detected by the BFF's recheck after the backend wrote.
    // A write returning 401 therefore also needs reconciliation, never replay.
    const employeeProblem = area === "employees" ? employeeProblemMetadataSchema.safeParse(result.employeeProblem) : undefined;
    return { status: "error", httpStatus: response.status, code: typeof result.code === "string" ? result.code : undefined, ...(employeeProblem?.success ? { employeeProblem: employeeProblem.data } : {}),
      uncertain: response.status >= 500 || response.ok || body !== undefined && response.status === 401 };
  } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
}
export function createOperationsRepository(area: RepositoryArea) {
  return {
    read<T>(action: string, query: Query, schema: z.ZodType<T>, signal?: AbortSignal) { return send(area, { ...query, action }, schema, undefined, signal); },
    write<T>(action: string, body: unknown, schema: z.ZodType<T>, id?: string, zoneId?: string) { return send(area, {}, schema, { action, id, zoneId, body }); },
    upload<T>(action: string, files: File[], body: unknown, schema: z.ZodType<T>, id?: string, zoneId?: string) {
      const form = new FormData(); form.set("payload", JSON.stringify(body));
      for (const file of files) form.append(area === "water" || area === "raft-details" ? "photo" : "files", file, file.name);
      return send(area, { action, id, zoneId }, schema, form);
    },
    async download(query: Query): Promise<WorkspaceResult<true>> {
      try {
        const response = await fetch(`/api/operations/${area}?${queryString({ ...query, action: "export" })}`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
        if (!response.ok) {
          const data = await response.json(); return { status: "error", httpStatus: response.status, code: data.code, uncertain: false };
        }
        if (!response.headers.get("content-type")?.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) throw new Error("Unexpected file");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a"); link.href = url; link.download = `${area}.xlsx`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        return { status: "success", data: true };
      } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
    },
  };
}
