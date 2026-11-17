import { laneIsUnavailable } from "./lane-availability";

type Lane = Parameters<typeof laneIsUnavailable>[0] & { laneNumber: number; canSeed?: boolean; seededPercent?: number | null };

/**
 * Lanes the seeding form may offer. A lane already at 100% never comes back (it stays on the overview diagram elsewhere);
 * the backend's `seedableLaneNumbers` decides when present. The lanes of the record being corrected remain selectable.
 */
export function seedingLaneChoices(lanes: readonly Lane[], ownLanes: readonly number[] = [], seedable?: readonly number[] | null) {
  return lanes.filter(lane => {
    if (ownLanes.includes(lane.laneNumber)) return true;
    if (laneIsUnavailable(lane) || (lane.seededPercent ?? 0) >= 100) return false;
    return seedable ? seedable.includes(lane.laneNumber) : lane.canSeed !== false;
  }).map(lane => lane.laneNumber).sort((a, b) => a - b);
}
