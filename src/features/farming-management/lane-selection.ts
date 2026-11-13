/** Shift ranges use the visible, eligible lane order; hidden or blocked lanes are never added. */
export function toggleLaneSelection(selected: readonly number[], eligible: readonly number[], number: number, anchor?: number, shift = false): number[] {
  if (!eligible.includes(number)) return [...selected];
  const first = anchor === undefined ? -1 : eligible.indexOf(anchor), last = eligible.indexOf(number);
  const range = shift && first >= 0 ? eligible.slice(Math.min(first, last), Math.max(first, last) + 1) : [number];
  return [...new Set(selected.includes(number) ? selected.filter(value => !range.includes(value)) : [...selected, ...range])].sort((a, b) => a - b);
}
