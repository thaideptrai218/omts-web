import { parseLaneRanges, uniqueSorted } from "./harvest-lane-ranges";

export type LaneSelectionOutcome = {
  /** The selection after the command; equal to `current` when the text could not be read. */
  next: number[];
  /** Tokens of either field that are not lane numbers or ranges. */
  invalid: string[];
  /** Lanes named in the range that cannot be picked (damaged, out of service, already seeded...). */
  refused: number[];
  /** Lanes that were in the selection and were removed by the exclusion field. */
  excluded: number[];
};

/**
 * "Chọn dải làn" plus "Bỏ các làn" as one pure step: (current ∪ range) minus the excluded lanes.
 * With `replace` the range starts a new selection instead of extending the current one. Unreadable text changes nothing.
 */
export function applyLaneRangeSelection({ current, range, exclude, eligible, replace = false }: {
  current: readonly number[]; range: string; exclude: string; eligible: readonly number[]; replace?: boolean;
}): LaneSelectionOutcome {
  const picked = parseLaneRanges(range), dropped = parseLaneRanges(exclude);
  const invalid = [...picked.invalid, ...dropped.invalid];
  if (invalid.length) return { next: [...current], invalid, refused: [], excluded: [] };
  const allowed = new Set(eligible), skip = new Set(dropped.numbers);
  const refused = picked.numbers.filter(number => !allowed.has(number));
  const base = uniqueSorted([...(replace && picked.numbers.length ? [] : current), ...picked.numbers.filter(number => allowed.has(number))]);
  return { next: base.filter(number => !skip.has(number)), invalid, refused, excluded: base.filter(number => skip.has(number)) };
}

/** Lanes that were selected and then taken out (unticked or excluded), for the "bỏ: 15, 18" part of the counter. */
export const droppedLanes = (previous: readonly number[], next: readonly number[], already: readonly number[] = []) =>
  uniqueSorted([...already, ...previous.filter(number => !next.includes(number))]).filter(number => !next.includes(number));
