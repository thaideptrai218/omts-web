"use client";
import { LaneOverview } from "@/features/farming-management/lane-overview";
const states = ["NotSeeded", "Growing", "BeingHarvested", "Harvested", "OutOfService"] as const;
export function LaneBoard({ lanes, selected, onSelect }: { lanes: readonly { id?: string; laneNumber: number; state: string | number; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean }[]; selected?: number; onSelect(lane: number): void }) {
  return <LaneOverview lanes={lanes.map(lane => ({ ...lane, state: typeof lane.state === "number" ? states[lane.state] : lane.state }))} opened={selected} onLaneClick={onSelect} label="Sơ đồ làn nuôi" />;
}
