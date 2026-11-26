"use client";
import Link from "next/link";
import type { z } from "zod";
import { StatusPill } from "@/components/ui/management-page";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { laneBlockedReason, laneStateChip } from "./harvest-lane-choices";
import type { harvestList } from "./records-contracts";

type Screen = z.infer<typeof harvestList>;
/** "Làn" facts of the open cycle: state, trips, apportioned cages and seed lots. Read only: the raft's harvest is finished with one button, "Hoàn tất thu hoạch bè". */
type BoardProps = { data: Screen; zoneId: string; raftId: string };
export function HarvestLanesBoard({ data, zoneId, raftId }: BoardProps) {
  if (!data.lanes.length) return null;
  return <section aria-label="Các làn của chu kỳ" className="mb-4">
    <h4 className="mb-2 text-sm font-semibold">Làn</h4>
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
        </li>;
      })}
    </ul>
  </section>;
}
