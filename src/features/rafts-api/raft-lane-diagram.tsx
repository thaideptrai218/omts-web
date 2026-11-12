"use client";
import { useState } from "react";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { HarvestAwareLaneOverview } from "@/features/cultivation-api/harvest-aware-lane-overview";
type Lane = { laneNumber: number; lineLengthM?: number | null; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean };
/** Two ropes bound the boat passage; lane numbers always come from the stored layout. */
export function RaftLaneDiagram({ lanes, length, harvestScope }: { lanes: readonly Lane[]; length?: number; harvestScope?: { raftId: string; zoneId: string; rowVersion?: string; onChanged(): void } }) {
  const [opened, setOpened] = useState<number>();
  if (!lanes.length) return null;
  const lane = lanes.find(value => value.laneNumber === opened), value = lane?.lineLengthM ?? length;
  const overview = { lanes, opened, onLaneClick: (number: number) => setOpened(current => current === number ? undefined : number), children: lane && <div className="flex items-center justify-between gap-3 text-sm"><strong>Làn {lane.laneNumber}</strong><span>Độ dài dây: {value == null ? "Chưa ghi nhận" : `${value.toLocaleString("vi-VN")} m`}</span></div> };
  return harvestScope ? <HarvestAwareLaneOverview {...overview} {...harvestScope} /> : <LaneOverview {...overview} />;
}
