type HarvestLaneProgress = { laneNumber: number; harvestedPercent?: number | null };

const round2 = (value: number) => Math.round(value * 100) / 100;

/** What is left to harvest on a lane: 100 minus the percent already harvested (100 when nothing was recorded). */
export function remainingHarvestPercent(lane: Pick<HarvestLaneProgress, "harvestedPercent"> | undefined): number {
  return Math.min(100, Math.max(0, round2(100 - (lane?.harvestedPercent ?? 0))));
}

/** Remaining harvest percent per lane number. */
export function harvestRemainingByLane(lanes: readonly HarvestLaneProgress[]): Record<string, number> {
  return Object.fromEntries(lanes.map(lane => [String(lane.laneNumber), remainingHarvestPercent(lane)]));
}

/**
 * The "Phần trăm thu thêm trong lần này" shown for each picked lane: what the user typed, else the lane's remaining percent
 * (100 for an untouched lane), so picking a lane fills it in and the supervisor only edits the lanes that were not fully harvested.
 */
export function shownHarvestPercents(selected: readonly number[], typed: Readonly<Record<string, string>>, remaining: Readonly<Record<string, number>>): Record<string, string> {
  return Object.fromEntries(selected.map(lane => [String(lane), typed[lane] ?? String(remaining[String(lane)] ?? 100)]));
}
