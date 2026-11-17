"use client";
import Link from "next/link";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { useToast } from "@/components/ui/toast-provider";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useMutation } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { laneBlockedReason, laneStateChip } from "./harvest-lane-choices";
import { finishLaneResult, type harvestList } from "./records-contracts";
import { harvestRepo } from "./records-shared";
import { FinishHarvestOverview } from "./finish-harvest-overview";
import { eligibleToFinish } from "./finish-harvest-model";

type Screen = z.infer<typeof harvestList>;
/** "Làn" facts of the open cycle: state, trips, apportioned cages, seed lots, and the one decisive action "Hoàn tất thu hoạch". */
type BoardProps = { data: Screen; zoneId: string; raftId: string; canFinish: boolean; onChanged(): void };
export function HarvestLanesBoard(props: BoardProps) {
  return props.data.lanes.length ? <LanesBoardBody {...props} /> : null;
}
function LanesBoardBody({ data, zoneId, raftId, canFinish, onChanged }: BoardProps) {
  const mutation = useMutation(), confirmation = useActionDialog(), { notify } = useToast();
  async function finish(laneNumber: number) {
    if (mutation.busy() || mutation.blocked) return;
    const accepted = await confirmation.confirm(`Hoàn tất thu hoạch làn ${laneNumber}? Làn chuyển sang Đã thu xong và không ghi nhận thêm chuyến thu cho làn này. Muốn hoàn tác phải sửa lô kèm lý do.`);
    if (!accepted) return;
    const saved = await mutation.run(() => harvestRepo.write("finish-lane", { laneNumber }, finishLaneResult, raftId, zoneId));
    if (!saved) return;
    notify(saved.changed ? { tone: "success", title: `Đã hoàn tất thu hoạch làn ${laneNumber}.`, ...(saved.everySeededLaneHarvested ? { description: "Tất cả làn đã thu xong. Có thể kết thúc chu kỳ." } : {}) } : { tone: "info", title: `Làn ${laneNumber} đã thu xong từ trước.` });
    onChanged();
  }
  return <section aria-label="Các làn của chu kỳ" className="mb-4">
    {confirmation.dialog}
    <h4 className="mb-2 text-sm font-semibold">Làn</h4>
    {canFinish && <FinishHarvestOverview lanes={data.lanes.map(lane => ({ ...lane, state: lane.state ?? undefined }))} raftId={raftId} zoneId={zoneId} eligibleLaneNumbers={data.lanes.filter(eligibleToFinish).map(lane => lane.laneNumber)} onChanged={onChanged} label="Sơ đồ làn thu hoạch" selectionDisabled={mutation.pending} />}
    {mutation.error && <p role="alert" className="mb-2 rounded-control border border-danger/30 bg-danger/5 p-2 text-sm text-danger">{mutation.error}</p>}
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.lanes.map(lane => {
        const chip = lane.state ? laneStateChip[lane.state] : undefined, blocked = laneBlockedReason(lane);
        return <li key={lane.laneNumber} className="grid gap-1 rounded-control border border-border bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>Làn {lane.laneNumber}</strong>{chip && <StatusPill tone={chip.tone}>{chip.label}</StatusPill>}</div>
          <p className="text-xs text-text-muted">
            {lane.lotCount ? `${lane.lotCount} chuyến` : "Chưa có chuyến thu"}
            {typeof lane.harvestedCages === "number" && lane.harvestedCages > 0 ? ` · ${lane.harvestedCages.toLocaleString("vi-VN")} lồng (chia đều theo lô)` : ""}
            {lane.lastHarvestDate ? ` · gần nhất ${formatVietnameseDate(lane.lastHarvestDate)}` : ""}
          </p>
          {!!lane.seedLotCodes?.length && <p className="text-xs text-text-muted">Giống: {lane.seedLotCodes.map((code, index) => <span key={code}>{index ? ", " : ""}<Link href={farmingReferenceHref("seeding", { zoneId, raftId, search: code })}>{code}</Link></span>)}</p>}
          {blocked && lane.state !== "Harvested" && <p className="text-xs text-text-muted">{blocked}</p>}
          {canFinish && lane.canFinish && !lane.isDamaged && !lane.isOutOfService && lane.statusId !== 2002 && lane.state !== "OutOfService" && <Button key={`finish-lane-${lane.laneNumber}`} type="button" className="mt-1 w-auto self-start" variant="secondary" disabled={mutation.pending} isPending={mutation.pending} onClick={() => void finish(lane.laneNumber)}>Hoàn tất thu hoạch</Button>}
        </li>;
      })}
    </ul>
  </section>;
}
