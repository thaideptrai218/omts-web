import { z } from "zod";
export const payRate = z.object({ hourlyRate: z.number(), effectiveFrom: z.iso.date(), effectiveTo: z.iso.date().nullish(),
  changedByName: z.string().nullish(), note: z.string().nullish(), usedInFinalizedPayroll: z.boolean().optional(), lockedReason: z.string().nullish() });
export const jobType = z.object({ id: z.guid(), name: z.string(), statusId: z.number().int(), status: z.string(), currentRate: payRate.nullable(), otherRates: z.array(payRate), rowVersion: z.string().min(1),
  finalizedPeriods: z.array(z.object({ from: z.iso.date(), to: z.iso.date() })).optional() });
export const jobsPage = z.object({ items: z.array(jobType), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() });
export const rateValues = z.strictObject({ hourlyRate: z.number().int().positive().max(999999999), effectiveFrom: z.iso.date(), note: z.string().trim().max(500).optional() });
export const addJob = rateValues.extend({ name: z.string().trim().min(1).max(100) });
