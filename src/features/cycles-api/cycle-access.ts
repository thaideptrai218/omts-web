import { operationAllowed } from "@/features/operations/permissions";
import type { CycleAccess } from "./cycle-plan-tab";

/**
 * What the account may do with cultivation cycles and care logs of one zone. `readOnly` (a discontinued zone opened by a link) leaves only the two read actions.
 */
export function cycleAccessFor(identity: { subjectType: string }, functions: Parameters<typeof operationAllowed>[2], zoneId: string, readOnly: boolean): CycleAccess {
  const allowed = (action: string) => !(readOnly && !["View", "LogsView"].includes(action)) && operationAllowed("cultivation-cycles", identity, functions, action, zoneId || undefined);
  return { view: allowed("View"), create: allowed("Create"), edit: allowed("Edit"), remove: allowed("Delete"), logs: allowed("LogsView"), logsCreate: allowed("LogsCreate"), logsEdit: allowed("LogsEdit") };
}
