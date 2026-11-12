"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { ErrorNotice } from "@/features/operations/ui";
import type { PlanLine } from "./contracts";
import { plannedLaneNumbers } from "./plan-logic";
import styles from "./plans.module.css";
import { planRepository, problemText } from "./repository";

/** "Không thu": the zone manager picks the lanes of a plan line that will not be harvested and says why; the Owner is told. */
export function SkipLanesDialog({ planId, planCode, line, onClose, onDone }: { planId: string; planCode: string; line: Pick<PlanLine, "id" | "raftCode" | "lanes">; onClose(): void; onDone(): void }) {
  const { notify } = useToast();
  const lanes = plannedLaneNumbers(line);
  const [picked, setPicked] = useState<number[]>([]), [reason, setReason] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState<string>();
  async function save() {
    if (!picked.length) { setError("Chọn ít nhất một luống không thu."); return; }
    if (!reason.trim()) { setError("Nhập lý do không thu."); return; }
    setPending(true); setError(undefined);
    const result = await planRepository.skipLanes(planId, line.id, picked, reason.trim());
    setPending(false);
    if (result.status !== "success") { setError(problemText(result)); return; }
    notify({ tone: "success", title: `Đã ghi không thu ${picked.length} luống của bè ${line.raftCode}; Chủ HTX được báo.` });
    onDone();
  }
  return <Dialog open title={`Không thu · bè ${line.raftCode} · ${planCode}`} dismissible={!pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    <div className="grid gap-3">
      <fieldset className="grid gap-2"><legend className="mb-1 text-sm font-medium">Luống không thu *</legend>
        <div className={styles.laneBox}>{lanes.map((lane) => <label key={lane} className={styles.lane} data-checked={picked.includes(lane)}>
          <input type="checkbox" checked={picked.includes(lane)} disabled={pending} onChange={(event) => setPicked(event.target.checked ? [...picked, lane].sort((a, b) => a - b) : picked.filter((item) => item !== lane))} />Luống {lane}</label>)}</div>
        {!lanes.length && <p className={styles.hint}>Không còn luống nào để đánh dấu.</p>}
      </fieldset>
      <label className="grid gap-1 text-sm font-medium">Lý do không thu *
        <textarea className="min-h-20 rounded-md border border-border-strong px-2 py-1.5 text-sm font-normal" aria-label="Lý do không thu" maxLength={500} disabled={pending} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <ErrorNotice error={error} />
      <div className="flex justify-end gap-2"><Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Bỏ qua</Button><Button className="w-auto" isPending={pending} disabled={!lanes.length} onClick={() => void save()}>Ghi không thu</Button></div>
    </div>
  </Dialog>;
}
