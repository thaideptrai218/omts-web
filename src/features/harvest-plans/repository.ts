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

/**
 * The text of a failed roster call. The people needed, the reason and the phone number each have their own sentence; a finished plan comes with the API's Vietnamese; a stale plan asks to reload.
 */
export function rosterErrorText(result: Result<unknown>) {
  if (result.status === "success") return undefined;
  const fields = [...(result.problem?.fields ?? []), ...(result.problem?.field ? [result.problem.field] : [])];
  if (result.code === "MSG-GEN-01") {
    if (fields.includes("Required people")) return "Số người cần phải từ 1 đến 500.";
    if (fields.includes("Reason")) return "Nhập lý do.";
    if (fields.includes("Phone number")) return "Nhập số điện thoại hợp lệ.";
    if (fields.includes("Full name")) return "Nhập họ tên.";
    if (fields.includes("Employees")) return "Chọn ít nhất một nhân viên.";
  }
  if (result.code === "MSG06") return "Kế hoạch vừa được người khác sửa. Bấm Làm mới rồi thử lại.";
  if (result.code === "MSG-GEN-09") return result.problem?.message && vietnamese.test(result.problem.message) ? result.problem.message : "Kế hoạch đã xong hoặc đã hủy nên không đổi người được.";
  return errorText(result);
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
  /** The plans given out to the zone manager's zones that are still to receive or being harvested. */
  assigned: (signal?: AbortSignal) => read("plans-assigned", {}, c.planList, signal),
  create: (body: SaveBody) => json("plan-create", { body }, c.planAnswer),
  update: (id: string, body: SaveBody) => json("plan-update", { id, body }, c.planAnswer),
  /** Gives the plan out; `executor` says who harvests it (the API takes the zone manager when it is left out) and cannot change afterwards. */
  assign: (id: string, rowVersion?: string, executor?: c.PlanExecutor) => json("plan-assign", { id, body: { ...(rowVersion ? { rowVersion } : {}), ...(executor ? { executor } : {}) } }, c.ack),
  /** The Zone Manager takes the plan given to the zone ("Nhận kế hoạch"). */
  receive: (id: string, rowVersion?: string) => json("plan-receive", { id, body: rowVersion ? { rowVersion } : {} }, c.ack),
  /** The Zone Manager hands the plan over to the Owner once every line is done ("Bàn giao cho chủ"). */
  handOver: (id: string, rowVersion?: string) => json("plan-hand-over", { id, body: rowVersion ? { rowVersion } : {} }, c.ack),
  finish: (id: string, rowVersion?: string) => json("plan-finish", { id, body: rowVersion ? { rowVersion } : {} }, c.ack),
  cancel: (id: string, reason: string, rowVersion?: string) => json("plan-cancel", { id, body: { reason, ...(rowVersion ? { rowVersion } : {}) } }, c.ack),
  skipLanes: (id: string, lineId: string, laneNumbers: number[], reason: string) => json("plan-skip-lanes", { id, lineId, body: { laneNumbers, reason } }, c.ack),
  unskipLanes: (id: string, lineId: string, laneNumbers: number[]) => json("plan-unskip-lanes", { id, lineId, body: { laneNumbers } }, c.ack),
  /** The Nhân công of a plan: the employees of each line the caller sees. */
  staffing: (id: string, signal?: AbortSignal) => read("plan-staffing", { id }, c.planStaffing, signal),
  /** Sets the whole crew of one line (employees left out are taken off); answers the line. */
  saveStaffing: (id: string, lineId: string, employeeIds: string[], rowVersion?: string) =>
    json("plan-line-staffing", { id, lineId, body: { employeeIds, ...(rowVersion ? { rowVersion } : {}) } }, c.staffingLine),
  /** The people chosen for the whole plan with their answers and the people needed; the screen polls it. */
  roster: (id: string, signal?: AbortSignal) => read("plan-roster", { id }, c.roster, signal),
  /** Chooses employees (staff and seasonal): those not on the roster are invited and told in the mobile app. */
  invite: (id: string, employeeIds: string[]) => json("plan-roster-invite", { id, body: { employeeIds } }, c.roster),
  /** The people needed (1 to 500, null clears it); never a block. */
  setRequired: (id: string, requiredPeople: number | null, rowVersion?: string) => json("plan-roster-required", { id, body: { requiredPeople, ...(rowVersion ? { rowVersion } : {}) } }, c.roster),
  /** The Owner (or the zone manager of the plan) confirms for an employee: the reason is required. */
  confirmStaff: (id: string, rowId: string, reason: string) => json("plan-roster-confirm", { id, rowId, body: { reason } }, c.roster),
  removeStaff: (id: string, rowId: string, reason?: string) => json("plan-roster-remove", { id, rowId, body: reason ? { reason } : {} }, c.roster),
  /** "Bổ sung nhân công": a person hired outside the system, counted at once; a seasonal login is made for them. */
  addExternal: (id: string, body: { fullName: string; phoneNumber: string; note?: string; address?: string; ownerApproved?: boolean }) => json("plan-roster-external", { id, body }, c.externalAdded),
};
