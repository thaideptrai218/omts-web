import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { bffFetch } from "@/features/auth/api/bff-fetch";
import { projectFarmingProblem } from "@/features/cultivation-api/farming-problem";
import { laneProgressSaved, laneProgressValues, type LaneProgressMetadata } from "./lane-progress-contracts";

export type LaneProgressTarget = { raftId: string; zoneId: string; laneNumber: number };
/** UI never calls HTTP directly; this adapter preserves status even for empty 404/405 responses. */
export const laneProgressRepository = {
  async save(target: LaneProgressTarget, input: unknown): Promise<WorkspaceResult<LaneProgressMetadata>> {
    const values = laneProgressValues.safeParse(input);
    if (!values.success) return { status: "error", httpStatus: 400, uncertain: false };
    try {
      const query = new URLSearchParams({ zoneId: target.zoneId });
      const response = await bffFetch(`/api/rafts/${encodeURIComponent(target.raftId)}/lanes/${target.laneNumber}/progress?${query}`, {
        method: "PUT", credentials: "same-origin", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(values.data),
      });
      const value = await response.json().catch(() => ({}));
      const parsed = laneProgressSaved.safeParse(value.data);
      if (response.ok && value.status === "success" && parsed.success && parsed.data.laneNumber === target.laneNumber) return { status: "success", data: parsed.data };
      const problem = projectFarmingProblem(value.problem);
      return { status: "error", httpStatus: response.ok ? 502 : response.status, code: typeof value.code === "string" ? value.code : undefined,
        ...(problem ? { problem } : {}), uncertain: response.ok || response.status >= 500 || response.status === 401 };
    } catch { return { status: "error", httpStatus: 0, uncertain: true }; }
  },
};
