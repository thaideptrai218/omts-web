/** Stable, compact lane numbers: duplicates and invalid physical numbers are ignored. */
export function compressLaneNumbers(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers.filter(number => Number.isInteger(number) && number > 0))].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index];
    let end = start;
    while (sorted[index + 1] === end + 1) end = sorted[++index];
    ranges.push(start === end ? String(start) : `${start}–${end}`);
  }
  return ranges.join(", ");
}

/** Parse explicit lane selections; a bounded range prevents accidental huge allocations. */
export function parseLaneRanges(text: string): number[] | null {
  if (!text.trim()) return [];
  const numbers = new Set<number>();
  for (const part of text.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) return null;
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > 200) return null;
    for (let number = start; number <= end; number++) numbers.add(number);
  }
  return [...numbers].sort((a, b) => a - b);
}
