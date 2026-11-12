/** Compare local ISO minutes, preserving datetime-local bounds within the same day. */
export function dateTimeBoundsError(value: string, min?: string, max?: string): string | undefined {
  const stamp = value.slice(0, 16);
  const shown = (bound: string) => `${bound.slice(8, 10)}/${bound.slice(5, 7)}/${bound.slice(0, 4)} ${bound.slice(11, 16)}`;
  if (min && min.includes("T") && stamp < min.slice(0, 16)) return `Thời gian phải từ ${shown(min)}.`;
  if (max && max.includes("T") && stamp > max.slice(0, 16)) return `Thời gian không được sau ${shown(max)}.`;
}
