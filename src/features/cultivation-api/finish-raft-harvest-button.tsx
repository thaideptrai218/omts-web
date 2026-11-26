"use client";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { ErrorNotice, useMutation } from "@/features/operations/ui";
import { eligibleToFinish } from "./finish-harvest-model";
import { finishHarvestLanes } from "./finish-harvest-repository";
import { AttendanceGatePanel, openAttendanceOf, ownerOverride, useIsCooperativeOwner } from "./record-crew-attendance";
import type { harvestList } from "./records-contracts";

type Screen = z.infer<typeof harvestList>;

/** Why one lane refused to finish, in the words of the screen; an unknown code keeps the backend's own sentence. */
export function laneRefusalText(lane: { reasonCode: string; message: string }): string {
  if (lane.reasonCode === "NotBeingHarvested") return "chưa có lô thu hoạch nào ghi nhận làn này.";
  if (lane.reasonCode === "LaneNotFound") return "không còn trên bè này.";
  return lane.message;
}

/** The lanes one click finishes: every lane of the raft the backend says can be finished now. */
export const lanesToFinish = (data: Pick<Screen, "lanes">) => data.lanes.filter(eligibleToFinish).map(lane => lane.laneNumber);

/**
 * "Hoàn tất thu hoạch bè": one raft-level action (owner decision 26/11/2026) in place of finishing lanes one by one.
 * It sends all finishable lanes in one all-or-nothing call; a refused lane is listed with the reason and nothing changes.
 */
type Props = { data: Screen; zoneId: string; raftId: string; canFinish: boolean; onChanged(): void };
export function FinishRaftHarvestButton(props: Props) {
  return props.canFinish && lanesToFinish(props.data).length ? <FinishRaftHarvest {...props} /> : null;
}
function FinishRaftHarvest({ data, zoneId, raftId, onChanged }: Props) {
  const [open, setOpen] = useState(false), [approval, setApproval] = useState("");
  const mutation = useMutation(), { notify } = useToast(), isOwner = useIsCooperativeOwner();
  const lanes = lanesToFinish(data), hasLots = data.lots.length > 0;
  const failure = mutation.failure, openCrew = openAttendanceOf(failure), refused = failure?.problem?.lanes;
  function close() {
    if (mutation.busy()) return;
    setOpen(false); setApproval(""); mutation.reviewed();
  }
  async function finish() {
    if (mutation.busy() || mutation.blocked || openCrew && isOwner && !approval.trim()) return;
    const outcome = await mutation.run(() => finishHarvestLanes(raftId, zoneId, lanes, undefined, ownerOverride(openCrew, approval)));
    if (!outcome) return;
    notify({ tone: "success", title: `Đã hoàn tất thu hoạch bè ${data.raftCode}.` });
    setOpen(false); setApproval(""); onChanged();
  }
  return <div className="mb-4 flex flex-wrap items-center gap-3">
    <Button type="button" className="w-auto" disabled={!hasLots} onClick={() => { mutation.reviewed(); setOpen(true); }}>Hoàn tất thu hoạch bè</Button>
    {!hasLots && <span className="text-sm text-text-muted">Ghi nhận ít nhất một lô thu hoạch trước khi hoàn tất.</span>}
    {open && <Dialog open title={`Hoàn tất thu hoạch bè ${data.raftCode}?`} dismissible={!mutation.pending} mobileLayout="compact" onOpenChange={next => { if (!next) close(); }}>
      <p className="text-sm">Hoàn tất thu hoạch bè {data.raftCode}? Tất cả làn của bè sẽ được đánh dấu đã thu xong.</p>
      <p className="mt-2 text-sm text-text-muted">Làn {compressLaneNumbers(lanes)}. Muốn hoàn tác phải sửa lô kèm lý do.</p>
      {openCrew ? <AttendanceGatePanel employees={openCrew} isOwner={isOwner} reason={approval} onReason={setApproval} /> : !refused?.length && <ErrorNotice error={mutation.error} />}
      {!!refused?.length && <div className="mt-3 text-sm" role="alert">
        <p className="font-semibold text-danger">Chưa hoàn tất được. Không có làn nào bị thay đổi.</p>
        <ul className="mt-2 space-y-1 text-danger" aria-label="Các làn chưa thể hoàn tất">{refused.map(lane => <li key={lane.laneNumber}><strong>Làn {lane.laneNumber}:</strong> {laneRefusalText(lane)}</li>)}</ul>
      </div>}
      {mutation.blocked && <p className="mt-3 text-sm" role="alert">Cần tải lại tình trạng bè để đối chiếu kết quả trước khi thử lại.</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => { const reload = mutation.blocked; close(); if (reload) onChanged(); }}>{mutation.blocked ? "Đóng và tải lại" : "Bỏ qua"}</Button>
        <Button type="button" className="w-auto" disabled={mutation.blocked || !!openCrew && (!isOwner || !approval.trim())} isPending={mutation.pending} onClick={() => void finish()}>Hoàn tất thu hoạch bè</Button>
      </div>
    </Dialog>}
  </div>;
}
