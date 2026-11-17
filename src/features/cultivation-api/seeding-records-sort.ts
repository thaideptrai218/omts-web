import type { SortState } from "@/components/ui/management-screen/management-table";

export type SeedingSortKey = "date" | "lot" | "pieces" | "lane" | "recorder" | "total";
type SortableRecord = { id: string; seedingDate: string; recordedAt: string; quantity: number; laneNumbers: readonly number[]; recordedByName: string | null; seedLot: { code: string } };

/** Newest first, like the list always was before the headers became clickable. */
export const defaultSeedingSort: SortState = { key: "date", direction: "desc" };

/** Running total after each record, oldest first (independent of how the table is sorted). */
export function seedingRunningTotals(records: readonly SortableRecord[]) {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const record of [...records].sort(byDate)) totals.set(record.id, sum += record.quantity);
  return totals;
}

const byDate = (a: SortableRecord, b: SortableRecord) => a.seedingDate.localeCompare(b.seedingDate) || a.recordedAt.localeCompare(b.recordedAt);
const firstLane = (record: SortableRecord) => record.laneNumbers.length ? Math.min(...record.laneNumbers) : Number.MAX_SAFE_INTEGER;
const collator = new Intl.Collator("vi", { numeric: true });

function compare(a: SortableRecord, b: SortableRecord, key: SeedingSortKey, totals: ReadonlyMap<string, number>) {
  switch (key) {
    case "date": return byDate(a, b);
    case "lot": return collator.compare(a.seedLot.code, b.seedLot.code);
    case "pieces": return a.quantity - b.quantity;
    case "lane": return firstLane(a) - firstLane(b);
    case "recorder": return collator.compare(a.recordedByName ?? "", b.recordedByName ?? "");
    case "total": return (totals.get(a.id) ?? a.quantity) - (totals.get(b.id) ?? b.quantity);
  }
}

/** Sorted copy of the records; ties fall back to date then time so the order stays stable in both directions. */
export function sortSeedingRecords<T extends SortableRecord>(records: readonly T[], sort: SortState, totals: ReadonlyMap<string, number>): T[] {
  const sign = sort.direction === "asc" ? 1 : -1, key = sort.key as SeedingSortKey;
  return [...records].sort((a, b) => sign * (compare(a, b, key, totals) || byDate(a, b)));
}
