"use client";
import { useMemo } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed } from "@/features/operations/permissions";
import { createOperationsRepository } from "@/features/operations/repository";
import { useRemote } from "@/features/operations/ui";

export const invoiceRepository = createOperationsRepository("sales-invoice-list");
const loadZones = (signal: AbortSignal) => loadOptions("zones", signal);
type ZoneOption = { id: string; label: string };

/** What the caller may do on the invoice list; `View` is also checked per zone, so the zone filter offers only the zones the caller may see. */
export function useInvoiceAccess() {
  const { identity, permissions } = useApiWorkspace();
  const allowed = (action: string, zoneId?: string) => operationAllowed("sales-invoice-list", identity, permissions.functionPermissions, action, zoneId);
  const view = allowed("View"), zones = useRemote(loadZones);
  const zoneOptions = useMemo<ZoneOption[]>(() => (zones.data ?? []).filter((zone) => operationAllowed("sales-invoice-list", identity, permissions.functionPermissions, "View", zone.id))
    .map((zone) => ({ id: zone.id, label: String(zone.code ?? zone.name ?? zone.id) })), [zones.data, identity, permissions.functionPermissions]);
  return { view, exportFile: allowed("Export"), zoneOptions };
}
