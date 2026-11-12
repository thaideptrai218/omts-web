"use client";
import { useState } from "react";
import { LaneOverview } from "@/features/farming-management/lane-overview";
type Lane = { laneNumber: number; lineLengthM?: number | null; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean };
/** Two ropes bound the boat passage; lane numbers always come from the stored layout. */
export function RaftLaneDiagram({ lanes, length }: { lanes: readonly Lane[]; length?: number }) {
  const [opened, setOpened] = useState<number>();
  if (!lanes.length) return null;
  const lane = lanes.find(value => value.laneNumber === opened), value = lane?.lineLengthM ?? length;
  return <LaneOverview lanes={lanes} opened={opened} onLaneClick={number => setOpened(current => current === number ? undefined : number)}>
    {lane && <div className="flex items-center justify-between gap-3 text-sm"><strong>Làn {lane.laneNumber}</strong><span>Độ dài dây: {value == null ? "Chưa ghi nhận" : `${value.toLocaleString("vi-VN")} m`}</span></div>}
  </LaneOverview>;
}
