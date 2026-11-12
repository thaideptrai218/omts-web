import { bffClient, errorText as inputErrorText, problemText as inputProblemText, type Failure, type ListQuery, type Result, type SaveBody } from "@/features/input-items/repository";
import * as c from "./contracts";

export type { Failure, Result };

const { read, json } = bffClient("/api/harvest-plans");

/** The API's own sentence for the plan rules (it names the lane and the raft); otherwise the usual wording of the code. */
const own = (result: Failure) => result.code?.startsWith("MSG-PLAN-") && result.problem?.message ? result.problem.message : undefined;
export const errorText = (result: Result<unknown>) => result.status === "success" ? undefined : own(result) ?? inputErrorText(result);
export const problemText = (result: Failure) => own(result) ?? inputProblemText(result);

export const planRepository = {
  list: (values: ListQuery, signal?: AbortSignal) => read("plans", values, c.planPage, signal),
  detail: (id: string, signal?: AbortSignal) => read("plan", { id }, c.planView, signal),
  byCode: (code: string, signal?: AbortSignal) => read("plan-by-code", { code }, c.planView, signal),
  nextCode: (signal?: AbortSignal) => read("plan-next-code", {}, c.nextCode, signal),
  /** The form of a plan made from an order (Owner): the order, its pickup time and its products with the cages worked out. */
  orderDraft: (orderId: string, signal?: AbortSignal) => read("plan-order-draft", { id: orderId }, c.planDraft, signal),
  /** The rafts a plan can use, with the product each farms and the state of each lane; one zone, or every zone without `zoneId` (Owner). */
  eligibleRafts: (zoneId?: string, signal?: AbortSignal) => read("plan-eligible-rafts", zoneId ? { zoneId } : {}, c.eligibleRafts, signal),
  /** The plans given out to the zone manager's zones that are still being harvested. */
  assigned: (signal?: AbortSignal) => read("plans-assigned", {}, c.planList, signal),
  create: (body: SaveBody) => json("plan-create", { body }, c.planAnswer),
  update: (id: string, body: SaveBody) => json("plan-update", { id, body }, c.planAnswer),
  assign: (id: string, rowVersion?: string) => json("plan-assign", { id, body: rowVersion ? { rowVersion } : {} }, c.ack),
  finish: (id: string, rowVersion?: string) => json("plan-finish", { id, body: rowVersion ? { rowVersion } : {} }, c.ack),
  cancel: (id: string, reason: string, rowVersion?: string) => json("plan-cancel", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.ack),
  skipLanes: (id: string, lineId: string, laneNumbers: number[], reason: string) => json("plan-skip-lanes", { id, lineId, body: { laneNumbers, reason } }, c.ack),
  unskipLanes: (id: string, lineId: string, laneNumbers: number[]) => json("plan-unskip-lanes", { id, lineId, body: { laneNumbers } }, c.ack),
};
