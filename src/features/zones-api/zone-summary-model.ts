import { z } from "zod";

/** Tabs of the in-place zone record; shared so summary cards can ask the panel to switch tab. */
export type ZoneTabKey = "info" | "map" | "rafts" | "licenses" | "cycles" | "staff" | "water";

/** Raft row as the zone's raft list returns it (size and coordinates are optional on the wire). */
export const zoneRaftRows = z.array(z.object({ id: z.string(), code: z.string(), statusId: z.number(), status: z.string(), laneCount: z.number().optional(),
  size: z.string().nullable().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional() }));
export type ZoneRaft = z.infer<typeof zoneRaftRows>[number];

const IN_USE = 101;
export function summarizeRafts(rafts: readonly ZoneRaft[]) {
  return { total: rafts.length, inUse: rafts.filter(raft => raft.statusId === IN_USE).length, lanes: rafts.reduce((sum, raft) => sum + (raft.laneCount ?? 0), 0) };
}

type CycleRow = { cycle: { startDate: string; closeDate: string | null } | null };
/** Open cycle = a cycle without a close date; `earliestStart` is the oldest of them (ISO dates sort as text). */
export function summarizeCycles(rows: readonly CycleRow[]) {
  const open = rows.flatMap(row => row.cycle && !row.cycle.closeDate ? [row.cycle.startDate] : []).sort();
  return { rafts: rows.length, open: open.length, earliestStart: open[0] ?? null };
}

const DAY_MS = 86_400_000;
/** Whole calendar days from `today` to `date` (both yyyy-mm-dd); negative when `date` has passed. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}
export function expiryText(expiryDate: string | null, today: string): string {
  if (!expiryDate) return "Không thời hạn";
  const days = daysUntil(expiryDate, today);
  return days > 0 ? `Còn ${days} ngày` : days === 0 ? "Hết hạn hôm nay" : `Quá hạn ${-days} ngày`;
}

type LicenseRow = { isReplaced: boolean; documentId: string | null };
/** Licences worth showing on the summary: documents that exist and were not replaced by a newer one. */
export const currentLicenses = <Row extends LicenseRow>(rows: readonly Row[]): Row[] => rows.filter(row => !row.isReplaced && row.documentId);

export const indicatorLabel = (indicator: string) => ({ ph: "pH", salinity: "độ mặn", temperature: "nhiệt độ" }[indicator.toLowerCase()] ?? indicator);
export const rangeText = (min: number | null, max: number | null) => min === null && max === null ? "Chưa đặt" : `${min ?? "—"} – ${max ?? "—"}`;
