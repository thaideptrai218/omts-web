"use client";
import { Suspense } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { Skeleton } from "@/features/operations/ui";
import { CycleDetailPanel } from "./cycle-detail-panel";
import type { CycleAccess } from "./cycle-plan-tab";
import { RaftCycleWorkspace } from "./raft-cycle-workspace";

/** Chu kỳ nuôi: one row per raft of the chosen zone; a row opens progress, plan, history and care log in place. */
export function CyclesScreen({ helpHref }: { helpHref?: string }) {
  const { identity, permissions } = useApiWorkspace();
  const accessFor = (zoneId: string): CycleAccess => {
    const allowed = (action: string) => operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, action, zoneId || undefined);
    return { view: allowed("View"), create: allowed("Create"), edit: allowed("Edit"), remove: allowed("Delete"), logs: allowed("LogsView"), logsCreate: allowed("LogsCreate"), logsEdit: allowed("LogsEdit") };
  };
  // useSearchParams (zone and raft links) needs a Suspense boundary on a statically rendered page.
  return <Suspense fallback={<Skeleton />}><RaftCycleWorkspace storageKey="cycles" icon="raft" title="Chu kỳ nuôi" area="cultivation-cycles" helpHref={helpHref}
    renderDetail={({ row, zoneId, guard, refresh }) => <CycleDetailPanel row={row} zoneId={zoneId} access={accessFor(zoneId)} guard={guard} onChanged={refresh} />} /></Suspense>;
}
