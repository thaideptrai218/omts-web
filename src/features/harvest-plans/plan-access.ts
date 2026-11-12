"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";

type Held = { functionCode: string; action: string };
const holds = (owner: boolean, staff: boolean, functions: readonly Held[], fn: string, action: string) => owner || staff && functions.some((p) => p.functionCode === fn && p.action === action);

/** What the account may do with harvest plans (function HARVEST_PLANS, scoped by zone on the API) and with the harvest it records from them (HARVESTS). */
export function usePlanAccess() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner", staff = identity.subjectType === "Staff", functions = permissions.functionPermissions;
  const can = (fn: string, action: string) => holds(owner, staff, functions, fn, action);
  return {
    owner, view: can("HARVEST_PLANS", "View"), create: can("HARVEST_PLANS", "Create"), edit: can("HARVEST_PLANS", "Edit"), remove: can("HARVEST_PLANS", "Delete"),
    /** Recording a lot from a plan line or marking lanes "Không thu". */
    harvest: can("HARVESTS", "Create"), viewHarvests: can("HARVESTS", "View"),
  };
}
export type PlanAccess = ReturnType<typeof usePlanAccess>;

export const canViewPlans = (identity: { subjectType: string }, functions: readonly Held[]) => holds(identity.subjectType === "CooperativeOwner", identity.subjectType === "Staff", functions, "HARVEST_PLANS", "View");
