"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { MaterialForm } from "@/features/cultivation-api/records-material-form";
import { RaftMaterialCosts } from "@/features/farming-api/raft-screen";
import { TabFooter } from "@/features/farming-management/detail-parts";
import type { RaftAccess } from "./raft-detail-panel";
import { IN_USE, type RaftDetail } from "./raft-model";
import { useOpenCycle } from "./use-open-cycle";

/**
 * "Vật tư": what the raft's material use cost, and "+ Dùng vật tư", which opens the material-use form of the Sử dụng vật tư screen with this zone,
 * raft and open cycle already set (the user picks only the items and quantities). The costs are read again after a save.
 */
export function RaftMaterialsTab({ raft, zoneId, access }: { raft: RaftDetail; zoneId: string; access: RaftAccess }) {
  const open = useOpenCycle(raft), [using, setUsing] = useState(false), [revision, setRevision] = useState(0);
  const canUse = !!access.materialCreate && raft.statusId === IN_USE && !!open.cycle;
  return <>
    {access.costs && <RaftMaterialCosts key={revision} raftId={raft.id} zoneId={zoneId} />}
    {!!access.materialCreate && !open.loading && !open.cycle && <p className="my-3 text-sm text-text-muted">Bè chưa có chu kỳ đang mở nên chưa ghi nhận được sử dụng vật tư.</p>}
    <TabFooter right={canUse ? <Button key="use-material" type="button" className="w-auto" onClick={() => setUsing(true)}><InterfaceIcon name="add" className="size-4" />Dùng vật tư</Button> : undefined} />
    {using && <MaterialForm zoneId={zoneId} raftId={raft.id} cycleId={open.cycle?.id} record={null} allowed={action => action === "Create" && canUse}
      onClose={() => setUsing(false)} onSaved={() => { setUsing(false); setRevision(value => value + 1); }} />}
  </>;
}
