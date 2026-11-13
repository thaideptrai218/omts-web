"use client";
import type { ComponentProps } from "react";
import { LaneOverview, type LaneOverviewItem } from "@/features/farming-management/lane-overview";
import { HarvestAwareLaneOverview } from "@/features/cultivation-api/harvest-aware-lane-overview";

type Lane = LaneOverviewItem & { lineLengthM?: number | null };
/** Physical lane numbers stay ordered; the detail uses the same popover as cultivation progress. */
export function RaftLaneDiagram({ lanes, length, harvestScope }: {
  lanes: readonly Lane[]; length?: number; harvestScope?: { raftId: string; zoneId: string; rowVersion?: string; onChanged(): void; onDirty?(dirty: boolean): void; onPending?(pending: boolean): void };
}) {
  if (!lanes.length) return null;
  const overview: ComponentProps<typeof LaneOverview> = { lanes, renderLaneDetails: lane => {
    const physical = lanes.find(item => item.laneNumber === lane.laneNumber), value = physical?.lineLengthM ?? length;
    return <p className="mt-2 text-xs text-text-muted">Độ dài dây: {value == null ? "Chưa ghi nhận" : `${value.toLocaleString("vi-VN")} m`}</p>;
  } };
  return harvestScope ? <HarvestAwareLaneOverview {...overview} {...harvestScope} /> : <LaneOverview {...overview} />;
}
