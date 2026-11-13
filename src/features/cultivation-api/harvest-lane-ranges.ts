/** Lane numbers as short text ("Làn 1–10, 15") and back ("1-10, 15, 20-25"), for the harvest lane picker and its summaries. */

/** Sorted, de-duplicated lane numbers. */
export const uniqueSorted = (numbers: readonly number[]) => [...new Set(numbers)].sort((a, b) => a - b);

/** "1–10, 15" for [1..10, 15]; consecutive runs of 3 or more are joined, a pair stays "1, 2". Empty for no lanes. */
export function formatLaneRanges(numbers: readonly number[]): string {
  const parts: string[] = [];
  const sorted = uniqueSorted(numbers);
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    if (j - i >= 2) parts.push(`${sorted[i]}–${sorted[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(sorted[k]));
    i = j + 1;
  }
  return parts.join(", ");
}

/** "Làn 1–10, 15" (Vietnamese has no plural, so one lane reads "Làn 3"). Empty for no lanes. */
export const laneSummary = (numbers: readonly number[]) => numbers.length ? `Làn ${formatLaneRanges(numbers)}` : "";

export type ParsedLaneRanges = { numbers: number[]; invalid: string[] };

/**
 * Reads "1-10, 15, 20-25" (comma, semicolon or space separated; "-", "–" or "—" for a range, either order). Anything that is not a lane number or range
 * is returned in `invalid` and a range longer than `limit` lanes is refused, so a typo like "1-99999999" cannot freeze the page.
 */
export function parseLaneRanges(text: string, limit = 1000): ParsedLaneRanges {
  const numbers = new Set<number>(), invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    const match = /^(\d{1,6})(?:[-–—](\d{1,6}))?$/.exec(token);
    if (!match) { invalid.push(token); continue; }
    const from = Number(match[1]), to = match[2] === undefined ? from : Number(match[2]);
    const low = Math.min(from, to), high = Math.max(from, to);
    if (low < 1 || high - low >= limit) { invalid.push(token); continue; }
    for (let n = low; n <= high; n++) numbers.add(n);
  }
  return { numbers: uniqueSorted([...numbers]), invalid };
}
