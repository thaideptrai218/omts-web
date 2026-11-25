/** Least important first: these go when the pane is too narrow for every chosen column (name, username and status never do). */
export const columnDropOrder = ["code", "lastDay", "jobs", "hours", "zones", "debt", "type", "phone", "role"] as const;

/** Width of the longest login name in the loaded rows (about 7px a character plus cell padding), within a sensible range. */
export function usernameColumnWidth(usernames: readonly string[]) {
  const longest = usernames.reduce((max, name) => Math.max(max, name.length + 1), 0);
  return Math.min(200, Math.max(120, longest * 7 + 20));
}

/**
 * Keeps as many of the chosen columns as fit `available` px next to the `fixed` px of checkbox and chevron columns, dropping
 * the least important first, so the table never needs a scrollbar. `available` 0 (not measured yet) keeps everything.
 */
export function fitColumns(keys: readonly string[], widthOf: (key: string) => number, available: number, fixed: number): string[] {
  const kept = [...keys];
  if (!available) return kept;
  const total = () => kept.reduce((sum, key) => sum + widthOf(key), fixed);
  for (const key of columnDropOrder) {
    if (total() <= available) break;
    const index = kept.indexOf(key);
    if (index >= 0) kept.splice(index, 1);
  }
  return kept;
}
