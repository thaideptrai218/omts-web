import { createWorkspaceRepository, type ApiRecord, type WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import type { ResourceKey } from "@/features/api-workspace/resources";
export async function loadOptions(resource: ResourceKey, signal: AbortSignal, query: Record<string, string> = {}): Promise<WorkspaceResult<ApiRecord[]>> {
  const repository = createWorkspaceRepository(resource), records = new Map<string, ApiRecord>();
  for (let page = 1; page <= 100; page++) {
    if (signal.aborted) return { status: "error", httpStatus: 0, uncertain: false };
    const result = await repository.list({ ...query, page: String(page), pageSize: "100" }, signal);
    if (result.status !== "success") return result;
    for (const row of result.data.items) records.set(row.id, row);
    if (page * 100 >= result.data.total) return { status: "success", data: [...records.values()] };
  }
  return { status: "error", httpStatus: 0, uncertain: false };
}
