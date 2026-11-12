"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { CycleStartDialog } from "./cycle-start-dialog";
import { canStartCycle, type CycleRow } from "./cycle-model";

/**
 * "Bắt đầu chu kỳ nuôi" for the raft opened on the Hành trình screen. `button` is the header action of a raft whose last cycle is closed;
 * `empty` is the empty state of a raft that never had one ("Bè này chưa có chu kỳ nuôi" + the button). The button is hidden for a raft
 * that is not in use, already has an open cycle, or when the account may not create cycles.
 */
export function CycleStartAction({ row, zoneId, zoneLabel, canCreate, variant, onStarted }: { row: CycleRow; zoneId: string; zoneLabel: string; canCreate: boolean; variant: "button" | "empty"; onStarted(cycleId: string | undefined): void }) {
  const [open, setOpen] = useState(false);
  const allowed = canCreate && canStartCycle(row);
  const button = allowed && <Button key="start-cycle" type="button" className="w-auto" onClick={() => setOpen(true)}><InterfaceIcon name="add"className="size-4" />Bắt đầu chu kỳ nuôi</Button>;
  return <>
    {variant === "empty"
      ? <div className="grid justify-items-start gap-3 py-2 text-sm"><p className="font-medium">Bè này chưa có chu kỳ nuôi</p>
        <p className="text-text-muted">{row.raftStatusId === 101 ? "Chọn một đợt ươm đã ươm xong, nhập sản lượng dự kiến và ảnh kế hoạch để bắt đầu chu kỳ." : "Bè ngừng sử dụng nên chưa thể bắt đầu chu kỳ nuôi."}</p>{button}</div>
      : button}
    {open && <CycleStartDialog raftId={row.raftId} raftCode={row.raftCode} zoneId={zoneId} zoneLabel={zoneLabel} onClose={() => setOpen(false)} onStarted={id => { setOpen(false); onStarted(id); }} />}
  </>;
}
