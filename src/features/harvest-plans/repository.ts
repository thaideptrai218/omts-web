import { bffClient, errorText as inputErrorText, problemText as inputProblemText, type Failure, type ListQuery, type Result, type SaveBody } from "@/features/input-items/repository";
import * as c from "./contracts";

export type { Failure, Result };

const { read, json } = bffClient("/api/harvest-plans");

/** The API's own sentence for the plan rules (it names the lane and the raft); otherwise the usual wording of the code. */
const own = (result: Failure) => result.code?.startsWith("MSG-PLAN-") && result.problem?.message ? result.problem.message : undefined;
export const errorText = (result: Result<unknown>) => result.status === "success" ? undefined : own(result) ?? inputErrorText(result);
export const problemText = (result: Failure) => own(result) ?? inputProblemText(result);

const vietnamese = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;
/**
 * The text of a failed Nhân công save. The plan's own refusals (MSG-GEN-09: the plan is over, its day has passed, no job type Thu hoạch, another day taken) come in Vietnamese from the API and say which one; the two work
 * assignment questions are worded here because their API text is English and the picker keeps them from happening except when two people choose at once.
 */
export function staffingErrorText(result: Result<unknown>) {
  if (result.status === "success") return undefined;
  if (result.code === "MSG-LABOR-06") return "Có nhân viên vừa được phân công ở bè khác trong ngày này. Hãy tải lại danh sách nhân viên rồi chọn lại.";
  if (result.code === "MSG-LABOR-07") return "Nhân viên đã điểm danh vào ca nên không thể bỏ khỏi bè này.";
  const message = result.code === "MSG-GEN-09" ? result.problem?.message : undefined;
  return message && vietnamese.test(message) ? message : errorText(result);
}

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
  /** The Nhân công of a plan: the employees of each line the caller sees. */
  staffing: (id: string, signal?: AbortSignal) => read("plan-staffing", { id }, c.planStaffing, signal),
  /** Sets the whole crew of one line (employees left out are taken off); answers the line. */
  saveStaffing: (id: string, lineId: string, employeeIds: string[], rowVersion?: string) =>
    json("plan-line-staffing", { id, lineId, body: { employeeIds, ...(rowVersion ? { rowVersion } : {}) } }, c.staffingLine),
};
