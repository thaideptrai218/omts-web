import { z } from "zod";

/**
 * Shapes of the Kế hoạch thu hoạch (KHT) module of the backend (api/harvest-plans), as the BFF at /api/harvest-plans hands them over. Times are ISO-8601
 * with offset, enums travel as strings. A plan is one planned time with lines over rafts of any zones; a line is one raft (its zone is the zone of the raft) with its
 * lanes, the product its raft farms and the cages expected, and the lot recorded from it. A lane is Planned, Harvested (it is in the lot of its line) or Skipped ("Không thu", with a reason).
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), count = z.number().int(), cages = z.number();

export const PLAN = { draft: 4201, assigned: 4202, harvesting: 4203, completed: 4204, cancelled: 4205 } as const;
export const laneStates = ["Planned", "Harvested", "Skipped"] as const;
export type PlanLaneState = (typeof laneStates)[number];
/** What the caller may do with a plan now (`allowedActions`); the screens show exactly these buttons. */
export type PlanAction = "Edit" | "Assign" | "Finish" | "Cancel" | "Harvest" | "SkipLane";

const account = z.object({ id, name: text });
export const zoneRef = z.object({ id, code: text, name: text });
export const planLane = z.object({ laneId: id, laneNumber: count, state: z.enum(laneStates), lotCode: opt, skippedAt: opt, skippedBy: account.nullish(), skipReason: opt });
export const planLot = z.object({ id, lotCode: text, cageCount: cages, estimatedKg: z.number(), harvestedAt: text });
export const planLine = z.object({
  id, lineNumber: count, raftId: id, raftCode: text, zone: zoneRef,
  /** The product the raft farms, read from the raft when the plan was saved: never typed on the plan. */
  expectedProduct: z.object({ id, code: text, name: text, sizeMinCm: z.number().nullish(), sizeMaxCm: z.number().nullish() }).nullish(), expectedCageCount: cages.nullish(), note: opt,
  state: z.enum(["Open", "Harvested", "Skipped"]), lot: planLot.nullish(), lanes: z.array(planLane),
  /** A lot can be recorded from the line now, or lanes left out (the caller still needs HARVESTS Create). */
  canHarvest: z.boolean(),
  /** The line has its lot or a lane left out: the Owner can no longer change it. */
  locked: z.boolean(),
  /** The first day the oysters of the raft are mature ("yyyy-MM-dd"), null when the seed gives no days; only a warning before an early harvest, never a block. */
  expectedHarvestDate: z.iso.date().nullish(),
});
export const planOrder = z.object({ id, code: text, statusId: count, status: text, customer: z.object({ id, code: text, name: text }).nullish() });
export const planProgress = z.object({ lines: count, linesDone: count, lanes: count, lanesHarvested: count, lanesSkipped: count });
export const planView = z.object({
  id, code: text, statusId: count, status: text, zones: z.array(zoneRef), plannedAt: text, note: opt, createdBy: account.nullish(),
  assignedAt: opt, assignedBy: account.nullish(), completedAt: opt, cancelledAt: opt, cancelledBy: account.nullish(), cancelReason: opt,
  lines: z.array(planLine), orders: z.array(planOrder), progress: planProgress, allowedActions: z.array(text), createdAt: text, rowVersion: text,
});
export const planRow = z.object({
  id, code: text, statusId: count, status: text, zones: z.array(zoneRef), plannedAt: text, note: opt, raftCodes: z.array(text), orders: z.array(planOrder), progress: planProgress,
  createdBy: opt, rowVersion: text, expectedCageCount: cages.nullish(),
});
export const planPage = z.object({ items: z.array(planRow), page: count, pageSize: count, total: count });
export const nextCode = z.object({ code: text });
/** The form of a new plan made from an order: the order and its pickup time, and its products with the cages worked out where the product has a Lồng unit (for reference only). */
export const planDraft = z.object({
  salesOrder: planOrder, plannedAt: opt,
  products: z.array(z.object({ productId: id, productCode: text, productName: text, unitId: id, unitCode: text, unitName: text, quantity: z.number(), expectedCageCount: cages.nullish() })),
});
/** A lane of a raft the plan can still use: Free, waiting in another open plan (`planCode`), or already harvested in the cycle. */
export const eligibleLaneStates = ["Free", "InAnotherPlan", "Harvested"] as const;
export const eligibleLane = z.object({ laneId: id, laneNumber: count, state: z.enum(eligibleLaneStates), planCode: opt });
/** A raft that can be planned for harvest: In Use, in a zone In Use, with an Open cycle and a lane that can be harvested; the product is the one it farms. */
export const eligibleRaft = z.object({
  raftId: id, raftCode: text, zone: zoneRef, product: z.object({ id, code: text, name: text, sizeMinCm: z.number().nullish(), sizeMaxCm: z.number().nullish() }).nullish(), lanes: z.array(eligibleLane),
  /** When the cycle started, the days its seed needs to mature and the first day it can be harvested ("yyyy-MM-dd"); null when no seed gives the days. */
  cycleStartDate: z.iso.date().nullish(), maturityDays: count.nullish(), expectedHarvestDate: z.iso.date().nullish(),
});
/** The API answers `{ rafts }`; the BFF hands on the list itself, which the browser reads with the same schema. */
export const eligibleRafts = z.union([z.object({ rafts: z.array(eligibleRaft) }).transform((value) => value.rafts), z.array(eligibleRaft)]);

/**
 * The Nhân công of a plan (GET api/harvest-plans/{id}/staffing): for each line the caller sees, the employees assigned to it for the day of the plan. `checkedIn`: the employee already checked in that day, so cannot be
 * taken off. `canEdit` (of the plan and of each line): the caller may choose the crew now (role, status of the plan and day not past).
 */
export const staffingEmployee = z.object({ employeeId: id, code: text, name: text, assignmentId: id, checkedIn: z.boolean() });
export const staffingLine = z.object({
  lineId: id, raftId: id, raftCode: text, zoneId: id, zoneCode: text, laneNumbers: z.array(count), plannedDate: z.iso.date(), employees: z.array(staffingEmployee), canEdit: z.boolean(),
});
export const planStaffing = z.object({ planId: id, planCode: text, rowVersion: text, lines: z.array(staffingLine), canEdit: z.boolean() });

/** A save, assign, finish or cancel answers `{ plan, message, messageCode }`; the skip actions answer the plan itself. */
export const planAnswer = z.union([z.object({ plan: planView }).transform((value) => value.plan), planView]);
/** The answer of assign, finish, cancel and the skip actions is not read: the screen reloads the plan. */
export const ack = z.unknown();
/** The plans given to the caller's zones that are Assigned or Harvesting. */
export const planList = z.union([z.object({ plans: z.array(planView) }).transform((value) => value.plans), z.array(planView)]);

export type PlanView = z.infer<typeof planView>;
export type StaffingEmployee = z.infer<typeof staffingEmployee>;
export type StaffingLine = z.infer<typeof staffingLine>;
export type PlanStaffing = z.infer<typeof planStaffing>;
export type PlanLine = z.infer<typeof planLine>;
export type PlanLane = z.infer<typeof planLane>;
export type PlanRow = z.infer<typeof planRow>;
export type PlanPage = z.infer<typeof planPage>;
export type PlanDraft = z.infer<typeof planDraft>;
export type PlanZone = z.infer<typeof zoneRef>;
export type EligibleLane = z.infer<typeof eligibleLane>;
export type EligibleRaft = z.infer<typeof eligibleRaft>;
