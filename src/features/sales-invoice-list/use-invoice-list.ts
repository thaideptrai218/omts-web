"use client";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";

export const invoiceRepository = createOperationsRepository("sales-invoice-list");

/** What the caller may do on the invoice list; `View` is also checked per zone by the API (the zone filter is the header selection, narrowed to the zones the caller may see). */
export function useInvoiceAccess() {
  const { identity, permissions } = useApiWorkspace();
  const allowed = (action: string, zoneId?: string) => operationAllowed("sales-invoice-list", identity, permissions.functionPermissions, action, zoneId);
  return { view: allowed("View"), exportFile: allowed("Export") };
}
