import { bffFetch } from "@/features/auth/api/bff-fetch";
import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { raftPageSchema, type RaftPage, type RaftPageQuery } from "./raft-page-contract";

/** One server-paged read of the rafts of a zone (code descending), filtered by status and a part of the code. */
export async function readRaftPage(query: RaftPageQuery, signal: AbortSignal): Promise<WorkspaceResult<RaftPage>> {
  const params = new URLSearchParams({ zoneId: query.zoneId, page: String(query.page), pageSize: String(query.pageSize) });
  if (query.statusId) params.set("statusId", query.statusId);
  if (query.search?.trim()) params.set("search", query.search.trim());
  try {
    const response = await bffFetch(`/api/raft-page?${params}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal, headers: { Accept: "application/json" } });
    const value = await response.json();
    const parsed = response.ok && value.status === "success" ? raftPageSchema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data }
      : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
