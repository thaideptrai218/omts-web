"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { canReadProducts } from "./product-permissions";

/** Writing the catalogue is the Owner's; the Xuất hủy hàu documents follow the zone-scoped function `PRODUCT_DISPOSALS`. */
export function useProductAccess() {
  const { identity, permissions } = useApiWorkspace();
  const owner = identity.subjectType === "CooperativeOwner";
  const can = (fn: string, action: string) => owner || identity.subjectType === "Staff" && permissions.functionPermissions.some((p) => p.functionCode === fn && p.action === action);
  return { owner, username: identity.username, can, view: canReadProducts(identity, permissions.functionPermissions) };
}
export type ProductAccessState = ReturnType<typeof useProductAccess>;

/** The access to the Xuất hủy hàu documents. */
export function useDisposalAccess() {
  const base = useProductAccess(), { can } = base;
  return { ...base, view: can("PRODUCT_DISPOSALS", "View"), create: can("PRODUCT_DISPOSALS", "Create"), edit: can("PRODUCT_DISPOSALS", "Edit"), remove: can("PRODUCT_DISPOSALS", "Delete"), exportFile: can("PRODUCT_DISPOSALS", "Export") };
}
export type DisposalAccess = ReturnType<typeof useDisposalAccess>;
