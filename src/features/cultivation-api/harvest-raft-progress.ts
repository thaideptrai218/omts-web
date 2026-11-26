/** The part of a lane the progress needs (the lanes of the raft harvest overview). */
export type ProgressLane = { state?: string | null; harvestedPercent?: number | null; isOutOfService?: boolean | null; isDamaged?: boolean | null };

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * How much of the raft's lanes is harvested: the lanes that were seeded count (not seeded, out of service or damaged lanes are left out), each by the percent already harvested
 * (a finished lane is 100). `done` is the number of lanes harvested in full. Null when the raft has no lane to harvest.
 */
export function raftHarvestProgress(lanes: readonly ProgressLane[]): { percent: number; done: number; total: number } | null {
  const counted = lanes.filter((lane) => lane.state && lane.state !== "NotSeeded" && lane.state !== "OutOfService" && !lane.isOutOfService && !lane.isDamaged);
  if (!counted.length) return null;
  const share = (lane: ProgressLane) => lane.state === "Harvested" ? 100 : Math.min(100, Math.max(0, lane.harvestedPercent ?? 0));
  const done = counted.filter((lane) => share(lane) >= 100).length;
  return { percent: round1(counted.reduce((sum, lane) => sum + share(lane), 0) / counted.length), done, total: counted.length };
}
