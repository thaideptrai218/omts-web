import { z } from "zod";
import { apiIdSchema } from "@/features/auth/api/auth-contract.schemas";
import { formatVietnameseDate } from "@/shared/format/date-only";

const count = z.number().int().nonnegative();
/** Lanes of a raft by state, as the backend counts them (list item `laneSummary`). */
export const raftLaneSummarySchema = z.object({ farming: count, notSeeded: count, harvested: count, damaged: count, outOfService: count });
/** The open cultivation cycle joined into the raft record; `null` when the raft has none. */
export const raftCurrentCycleSchema = z.object({ id: apiIdSchema, startDate: z.string(), daysFarming: count, seedNames: z.array(z.string()).default([]), laneSummary: raftLaneSummarySchema.nullish() });
export type RaftLaneSummary = z.infer<typeof raftLaneSummarySchema>;
export type RaftCurrentCycle = z.infer<typeof raftCurrentCycleSchema>;

export const laneTotal = (summary: RaftLaneSummary) => summary.farming + summary.notSeeded + summary.harvested + summary.damaged + summary.outOfService;

/** "6/10 làn đang nuôi", with the lanes in the other states under it ("2 đã thu · 1 hỏng · 1 chưa thả"). */
export function laneSummaryText(summary: RaftLaneSummary): { text: string; detail: string } {
  const parts: [number, string][] = [[summary.harvested, "đã thu"], [summary.damaged, "hỏng"], [summary.outOfService, "ngừng"], [summary.notSeeded, "chưa thả"]];
  return { text: `${summary.farming}/${laneTotal(summary)} làn đang nuôi`, detail: parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`).join(" · ") };
}

/** One line for the "Hiện trạng" group: the open cycle, its days, seed and lanes, or "Chưa có chu kỳ". */
export function currentStateText(cycle: RaftCurrentCycle | null): string {
  if (!cycle) return "Chưa có chu kỳ";
  const lanes = cycle.laneSummary;
  return [`Chu kỳ đang mở từ ${formatVietnameseDate(cycle.startDate)}`, `${cycle.daysFarming} ngày nuôi`,
    ...(cycle.seedNames.length ? [`Giống: ${cycle.seedNames.join(", ")}`] : []),
    ...(lanes ? [laneSummaryText(lanes).text, ...(lanes.notSeeded > 0 ? [`${lanes.notSeeded} chưa thả`] : [])] : [])].join(" · ");
}

export type CyclePhase = { label: string; tone: "success" | "info" | "neutral" };
/**
 * Phase of the raft for the list, from its open cycle and its lane counts: no open cycle → "Chưa có chu kỳ"; an open cycle with lanes farming → "Đang nuôi"; every lane
 * harvested while the cycle is still open → "Đã thu xong"; an open cycle with nothing seeded yet → "Chờ thả giống". A raft with no cycle is not "chưa nuôi": it may be
 * between cycles or stopped for repair.
 */
export function cyclePhaseLabel(hasOpenCycle: boolean, summary: RaftLaneSummary | null | undefined): CyclePhase {
  if (!hasOpenCycle) return { label: "Chưa có chu kỳ", tone: "neutral" };
  if (summary && summary.farming > 0) return { label: "Đang nuôi", tone: "success" };
  if (summary && summary.harvested > 0) return { label: "Đã thu xong", tone: "neutral" };
  return { label: "Chờ thả giống", tone: "info" };
}
