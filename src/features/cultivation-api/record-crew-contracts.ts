import { z } from "zod";

/** Write side: employee ids of the lot's crew (API contract of 12/11/2026: at most 100, each once). */
export const crewIds = z.array(z.guid()).max(100).refine(ids => new Set(ids).size === ids.length);
/** Read side: `crew: [{ id, code, name }]` in HarvestLotView, listed by name. */
/** Where the employee stands on the record's day: assigned, checked in, done (checked out). `work.minutes` is the raw time between check-in and check-out. */
export const crewAttendance = z.enum(["NotAssigned", "NotCheckedIn", "Working", "Done"]);
export const crewWork = z.object({ checkedInAt: z.string().nullish(), checkedOutAt: z.string().nullish(), minutes: z.number().nullish() });
export const crewMember = z.object({ id: z.guid(), code: z.string().nullish(), name: z.string(), attendance: crewAttendance.optional().catch(undefined), work: crewWork.nullish().catch(undefined) });
export const crewReadFields = { crew: z.array(crewMember).optional() };
/** GET /api/rafts/{id}/crew-suggestions?date=: employees assigned to that raft on that day. */
export const crewSuggestions = z.object({ employees: z.array(crewMember) });
/** Answer of a save that listed employees: what the automatic work assignment did (null when no new employee was added). */
export const crewAssignmentResult = z.object({
  created: z.number().int().nonnegative(),
  skipped: z.array(z.object({ employeeId: z.guid(), reason: z.string().max(60) })).default([]),
}).nullish();
/** Answer of cancelling a record that had a crew: assignments given back, and who keeps the attendance because they already checked in. */
export const crewReleaseResult = z.object({ removed: z.number().int().nonnegative(), kept: z.array(z.string()).default([]) }).nullish();
export type CrewReleaseResult = z.infer<typeof crewReleaseResult>;
export function crewReleaseNotice(result: CrewReleaseResult, record = "đợt ươm"): string | undefined {
  if (!result || (!result.removed && !result.kept.length)) return undefined;
  const parts: string[] = [];
  if (result.removed) parts.push(`Đã hủy ${result.removed} phân công của ${record}.`);
  if (result.kept.length) parts.push(`Giữ nguyên chấm công của ${result.kept.join(", ")} vì đã vào làm.`);
  return parts.join(" ");
}
export const crewAssignmentFields = { crewAssignment: crewAssignmentResult };
export type CrewAssignmentResult = z.infer<typeof crewAssignmentResult>;
