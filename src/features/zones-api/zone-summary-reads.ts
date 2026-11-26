import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
/** Keeps one loader shape while skipping the read for a section the account may not see. */
export const skipped = <Value,>(empty: Value): Promise<WorkspaceResult<Value>> => Promise.resolve({ status: "success", data: empty });
