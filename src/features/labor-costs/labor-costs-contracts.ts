import { z } from "zod";

/**
 * Wire contract of "Chi phí nhân công" (BR-LABOR-07): `GET /api/labor-costs/rafts`, `GET /api/labor-costs/rafts/{raftId}/cycles` and `GET /api/labor-costs/cycles/{cycleId}`.
 * Money is whole VND, dates are yyyy-MM-dd, hours are paid hours (break deducted). Besides the money the backend gives the hours and the split by job type, and for a cycle the split by employee.
 */
const id = z.guid(), money = z.number().int(), day = z.iso.date(), hours = z.number();

/** Hours and cost of one job type inside a raft, a cycle, or one employee's share of it. */
export const jobLaborCost = z.object({ jobTypeId: id, jobName: z.string(), hours, amount: money });
/** One raft in the period; `raftId` is null for the work done at zone level (nursery), which belongs to the zone itself. */
export const raftLaborCost = z.object({
  raftId: id.nullable(), raftCode: z.string().nullable(), zoneId: id, zoneName: z.string(), amount: money, hours: hours.optional(), byJob: z.array(jobLaborCost).nullish(),
});
export const laborCostByRaft = z.object({ from: day, to: day, total: money, items: z.array(raftLaborCost), totalHours: hours.optional() });
export const employeeLaborCost = z.object({ employeeId: id, employeeCode: z.string().nullish(), employeeName: z.string(), hours, amount: money, byJob: z.array(jobLaborCost) });
export const cycleLaborCost = z.object({
  cycleId: id, raftId: id, raftCode: z.string(), startDate: day, closeDate: day.nullable(), amount: money,
  days: z.array(z.object({ date: day, amount: money })),
  hours: hours.optional(), byJob: z.array(jobLaborCost).nullish(), employees: z.array(employeeLaborCost).nullish(),
});
export const raftCycleCosts = z.array(cycleLaborCost);
export type EmployeeLaborCost = z.infer<typeof employeeLaborCost>;
export type JobLaborCost = z.infer<typeof jobLaborCost>;
export type RaftLaborCost = z.infer<typeof raftLaborCost>;
export type LaborCostByRaft = z.infer<typeof laborCostByRaft>;
export type CycleLaborCost = z.infer<typeof cycleLaborCost>;