import type { z } from "zod";
import type { cycleProgress } from "@/features/cycles-api/contracts";

/** Today's lane progress of a raft (the same read the cycle journey uses). */
export type LiveProgress = z.infer<typeof cycleProgress>;
export type LiveLane = LiveProgress["lanes"][number];

/** Lanes of the raft record (physical facts such as the line length) overlaid with today's progress (state, seeded and harvested %), lane by lane. */
export function mergeLiveLanes<L extends { laneNumber: number }>(base: readonly L[], live?: readonly LiveLane[]): (L & Partial<LiveLane>)[] {
  const byNumber = new Map((live ?? []).map(lane => [lane.laneNumber, lane] as const));
  return base.map(lane => ({ ...lane, ...byNumber.get(lane.laneNumber) }));
}
