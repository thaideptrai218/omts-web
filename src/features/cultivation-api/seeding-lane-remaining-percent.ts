type LaneProgress = { laneNumber: number; seededPercent?: number | null; remainingPercent?: number | null };

const round2 = (value: number) => Math.round(value * 100) / 100;

/** What is left to seed on a lane: the backend's `remainingPercent`, else 100 minus the percent already seeded, else 100. */
export function remainingLanePercent(lane: Pick<LaneProgress, "seededPercent" | "remainingPercent"> | undefined): number {
  const value = lane?.remainingPercent ?? (lane?.seededPercent != null ? 100 - lane.seededPercent : 100);
  return Math.min(100, Math.max(0, round2(value)));
}

/** Remaining percent per lane number, for the lanes the form may pick. */
export function remainingPercentByLane(lanes: readonly LaneProgress[]): Record<string, number> {
  return Object.fromEntries(lanes.map(lane => [String(lane.laneNumber), remainingLanePercent(lane)]));
}

/** Default "% làn đạt (ước lượng)" text of each selected lane: its remaining percent (100 when nothing was seeded yet). */
export function defaultSeedingPercents(selected: readonly number[], remaining: Readonly<Record<string, number>>): Record<string, string> {
  return Object.fromEntries(selected.map(lane => [String(lane), String(remaining[String(lane)] ?? 100)]));
}

/** First selected lane whose typed percent is above what is left: "Làn N chỉ còn X% có thể thả." */
export function overRemainingPercentProblem(selected: readonly number[], drafts: Readonly<Record<string, string>>, remaining: Readonly<Record<string, number>>): string | undefined {
  for (const lane of selected) {
    const left = remaining[String(lane)], typed = Number((drafts[lane] ?? "").replace(",", "."));
    if (left !== undefined && Number.isFinite(typed) && typed > left) return laneRemainingMessage(lane, left);
  }
}

export const laneRemainingMessage = (lane: number, left: number) => `Làn ${lane} chỉ còn ${left.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}% có thể thả.`;
