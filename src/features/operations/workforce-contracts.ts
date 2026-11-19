import { z } from "zod";

/**
 * Contracts of the attendance extras of the workforce screen (docs: plans/261119-1500-GH-227-hr-kiotviet-style/reports/hr-backend-contracts.md):
 * the correction of one day, the crew start, and the attendance of Staff employees. Responses are lenient; requests are strict.
 */
const instant = z.iso.datetime({ offset: true }), guid = z.guid();
const nullableInstant = instant.nullish().transform((v) => v ?? null);

/** One Staff employee of the caller's zones with the check-in and check-out of a day (GET /api/workforce/staff-attendance). */
export const staffAttendanceSchema = z.object({ employeeId: guid, employeeName: z.string(), employeeCode: z.string().nullish().transform((v) => v ?? null), date: z.iso.date(),
  checkedInAt: nullableInstant, checkedOutAt: nullableInstant, complete: z.boolean().optional(), onLeave: z.boolean().optional() });
export type StaffAttendance = z.infer<typeof staffAttendanceSchema>;

export const dayPeriodSchema = z.object({ id: guid, jobTypeId: guid, job: z.string(), raftId: guid.nullish().transform((v) => v ?? null), raftCode: z.string().nullish().transform((v) => v ?? null),
  startsAt: nullableInstant, zoneId: guid.nullish().transform((v) => v ?? null) });
/** GET /api/workforce/attendance/{employeeId}/{day}: the attendance and the job periods of one day, with the hours worked out when it is complete. */
export const attendanceDaySchema = z.object({ employeeId: guid, employeeName: z.string(), type: z.string().optional(), date: z.iso.date(), checkedInAt: nullableInstant, checkedOutAt: nullableInstant,
  complete: z.boolean(), periods: z.array(dayPeriodSchema), jobs: z.array(z.object({ jobTypeId: guid, job: z.string(), hours: z.number() })), rowVersion: z.string().nullish().transform((v) => v ?? null) });
export type AttendanceDay = z.infer<typeof attendanceDaySchema>;
export const attendanceCorrectedSchema = z.object({ day: attendanceDaySchema, message: z.string().optional(), messageCode: z.string().optional() });

/** PUT body of the correction: the times replace the record, the periods replace the job periods of the day, the reason is mandatory. */
export const correctAttendanceSchema = z.strictObject({
  checkInAt: instant.nullable(), checkOutAt: instant.nullable(),
  periods: z.array(z.strictObject({ jobTypeId: guid, raftId: guid.nullable(), startsAt: instant.nullable(), zoneId: guid.nullable() })).max(20),
  reason: z.string().trim().min(1).max(500), rowVersion: z.string().nullable(),
});

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
/** POST /api/workforce/crew-start: the check-in of the chosen members of a raft (or zone) at the start time of the crew, with the reason. */
export const crewStartSchema = z.strictObject({ raftId: guid.optional(), zoneId: guid.optional(), startTime: clock, reason: z.string().trim().min(1).max(500), employeeIds: z.array(guid).min(1).max(100) })
  .refine((v) => !!v.raftId !== !!v.zoneId, { path: ["raftId"] });
