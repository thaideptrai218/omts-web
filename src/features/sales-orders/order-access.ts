"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";

type Held = { functionCode: string; action: string };
const holds = (owner: boolean, staff: boolean, functions: readonly Held[], fn: string, action: string) => owner || staff && functions.some((p) => p.functionCode === fn && p.action === action);

/** What the account may do with orders (function SALES_ORDERS, scoped by zone on the API) and what it may add around them. */
export function useOrderAccess() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner", staff = identity.subjectType === "Staff", functions = permissions.functionPermissions;
  const can = (fn: string, action: string) => holds(owner, staff, functions, fn, action);
  return {
    owner, username: identity.username,
    view: can("SALES_ORDERS", "View"), create: can("SALES_ORDERS", "Create"), edit: can("SALES_ORDERS", "Edit"), remove: can("SALES_ORDERS", "Delete"), exportFile: can("SALES_ORDERS", "Export"),
    addCustomer: can("CUSTOMERS", "Create"),
  };
}
export type OrderAccess = ReturnType<typeof useOrderAccess>;

export const canViewOrders = (identity: { subjectType: string }, functions: readonly Held[]) => holds(identity.subjectType === "CooperativeOwner", identity.subjectType === "Staff", functions, "SALES_ORDERS", "View");
export const canCreateOrders = (identity: { subjectType: string }, functions: readonly Held[]) => holds(identity.subjectType === "CooperativeOwner", identity.subjectType === "Staff", functions, "SALES_ORDERS", "Create");
