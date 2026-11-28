import { z } from "zod";
import { cagesSchema, ownerResponseSchema } from "@/features/trader-purchases/contracts";

/** Trạng thái yêu cầu mua (StatusIds.PurchaseRequest): bộ lọc `statusId` của GET /api/purchase-requests. "Hoàn thành" chỉ là cờ `fulfilled`, không có mã riêng. */
export const REQUEST_STATUS_FILTERS = ["3201", "3202", "3203", "3204", "3206"] as const;
export const requestStatusFilterSchema = z.enum(REQUEST_STATUS_FILTERS);
const customerSchema = z.object({ id: z.guid(), name: z.string(), phoneNumber: z.string().nullable(), currentDebt: z.number(), code: z.string().nullish() });
/** Kế hoạch nhân lực Chủ HTX gửi trước khi nhận đơn (PurchaseStaffingView); chỉ đọc vài trường, mọi trường khác bị bỏ qua. */
export const staffingSchema = z.object({ cages: z.number().int(), workDate: z.iso.date(), pickupDate: z.iso.date(), requiredEmployees: z.number().int(), approvedEmployees: z.number().int(), hasEnoughStaff: z.boolean(), cagesPerEmployeePerDay: z.number().int().nullish(), note: z.string().nullish() }).loose();
/**
 * POST /api/purchase-requests/{id}/staffing (PlanPurchaseStaffing): the Owner's staffing plan. The backend makes the work assignments at once and leaves the request "Chờ phản hồi";
 * the cages, days, capacity and note of a sent plan cannot change, only more employees can be added.
 */
export const staffingPlanSchema = z.strictObject({ cages: z.number().int().positive(), workDate: z.iso.date(), pickupDate: z.iso.date(), cagesPerEmployeePerDay: z.number().int().positive(),
  employeeIds: z.array(z.guid()).min(1).max(100).refine((ids) => new Set(ids).size === ids.length), note: z.string().max(500).nullable(), rowVersion: z.string().min(1) })
  .refine((plan) => plan.pickupDate >= plan.workDate);
/** GET /api/purchase-requests/staffing-employees: the in-scope employees the plan can choose, each with the reason it cannot be chosen when it cannot. */
export const staffingEmployeeSchema = z.object({ id: z.guid(), name: z.string(), available: z.boolean(), unavailableReason: z.string().nullish() });
export const staffingEmployeesSchema = z.array(staffingEmployeeSchema);
/** GET /api/purchase-requests/{id}/staffing: the employees already chosen (answered at once, nothing to accept). */
export const staffingChosenSchema = z.array(z.object({ id: z.guid(), employeeId: z.guid(), employeeName: z.string() }).loose());
export type StaffingEmployee = z.infer<typeof staffingEmployeeSchema>;
export const requestSendingSchema = z.object({ channel: z.string(), phoneNumber: z.string().nullable(), deliveryStatusId: z.number().int().nullable(), deliveryStatus: z.string().nullable(), deliveryStatusAt: z.iso.datetime({ offset: true }).nullable() });
/** PurchaseRequestView của backend: số lượng là lồng nguyên; Code/Staffing/Harvest... là trường thêm, đọc khoan dung (không làm hỏng danh sách). */
export const purchaseRequestSchema = z.object({ id: z.guid(), customer: customerSchema, productId: z.guid(), productName: z.string(), requestedCages: z.number().int(), pickupDate: z.iso.date(), note: z.string().nullable(),
  code: z.string().nullish(), staffing: staffingSchema.nullish().catch(undefined), harvestCompletedAt: z.iso.datetime({ offset: true }).nullish(),
  sentAt: z.iso.datetime({ offset: true }), statusId: z.number().int(), status: z.string(), fulfilled: z.boolean(), response: ownerResponseSchema.nullable(), cancelReason: z.string().nullable(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable(), sendings: z.array(requestSendingSchema), rowVersion: z.string(),
  salesOrderId: z.guid().nullish(), salesOrderCode: z.string().nullish() });
export const purchaseRequestPageSchema = z.object({ items: z.array(purchaseRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
const requestText = z.string().max(1000);
/** POST /api/purchase-requests/{id}/accept (AcceptPurchaseRequest): chỉ Chủ HTX; backend chỉ cần đã có kế hoạch nhân sự (400 "Staffing plan required" nếu chưa). */
export const acceptRequestSchema = z.strictObject({ acceptedCages: cagesSchema,pickupDate: z.iso.date(), payLaterAgreed: z.boolean(), note: requestText.nullable(), rowVersion: z.string().min(1) });
/** POST /api/purchase-requests/{id}/decline (DeclinePurchaseRequest): lý do bắt buộc. */
export const declineRequestSchema = z.strictObject({ note: requestText.refine((v) => v.trim().length > 0), rowVersion: z.string().min(1) });

export const salesProductSchema = z.object({ id: z.guid(), code: z.string(), name: z.string(), description: z.string().nullable(), inUse: z.boolean(), availableForPurchase: z.boolean(), rowVersion: z.string() });

export const assignmentSchema = z.object({ id: z.guid(), employeeId: z.guid(), employeeName: z.string(), zoneId: z.guid(), raftId: z.guid().nullable(), raftCode: z.string().nullable(),
  jobTypeId: z.guid().nullable(), job: z.string(), date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable(),
  workedMinutes: z.number().nullish().transform((v) => v ?? null), breakMinutes: z.number().nullish().transform((v) => v ?? null), onLeave: z.boolean().optional() });
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export const saveProductSchema = z.strictObject({ code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(200), description: z.string().max(2000).nullable(), inUse: z.boolean(), rowVersion: z.string().min(1).nullable() });
/** Request types of the backend (EmployeeRequestType): leave, or the time of a missed check-in / check-out to record once approved. */
export const requestTypeSchema = z.enum(["Leave", "MissedCheckIn", "MissedCheckOut"]);
export const leaveSchema = z.object({ id: z.guid(), employeeName: z.string(), from: z.iso.date(), to: z.iso.date(), reason: z.string(), approved: z.boolean().nullable(), response: z.string().nullable(), rowVersion: z.string(), cancelledAt: z.iso.datetime({ offset: true }).nullable(),
  type: requestTypeSchema.catch("Leave"), requestedTime: z.string().nullish().transform((v) => v ?? null) });
const periodSchema = z.object({ jobTypeId: z.guid(), job: z.string(), raft: z.string().nullable(), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), minutes: z.number() });
const attendanceDaySchema = z.object({ date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable(), periods: z.array(periodSchema), jobs: z.array(z.object({ jobTypeId: z.guid(), job: z.string(), hours: z.number() })), complete: z.boolean() });
export const myWorkSchema = z.object({ employeeId: z.guid().nullable(), name: z.string().nullable(), assignments: z.array(assignmentSchema), attendance: z.array(attendanceDaySchema), requests: z.array(leaveSchema) });
export const requestLeaveSchema = z.strictObject({ from: z.iso.date(), to: z.iso.date(), reason: z.string().trim().min(1).max(500), clientOperationId: z.uuid() }).refine((v) => v.to >= v.from);
export const reviewLeaveSchema = z.strictObject({ approved: z.boolean(), response: z.string().max(500), rowVersion: z.string().min(1) }).refine((v) => v.approved || !!v.response.trim());
export const workforceLookupsSchema = z.object({ jobs: z.array(z.object({ id: z.guid(), name: z.string() })), employees: z.array(z.object({ id: z.guid(), name: z.string(), onLeave: z.boolean(), /** "Staff" (nội bộ) or "SeasonalWorker" (thời vụ), when the API tells. */ type: z.string().nullish(), assignment: z.object({ zoneId: z.guid(), raftId: z.guid().nullable(), raftCode: z.string().nullable(), jobTypeId: z.guid(), job: z.string() }).nullish().catch(undefined) })) });
const employeeIds = z.array(z.guid()).min(1).max(100).refine((v) => new Set(v).size === v.length);
// Work is on a raft, or on a zone alone when there is no raft (a nursery): exactly one of raftId / zoneId.
const raftOrZone = (v: { raftId?: string; zoneId?: string }) => !!v.raftId !== !!v.zoneId;
export const assignWorkSchema = z.strictObject({ raftId: z.guid().optional(), zoneId: z.guid().optional(), jobTypeId: z.guid(), date: z.iso.date(), employeeIds, moveExisting: z.boolean() }).refine(raftOrZone, { path: ["raftId"] });
export const crewWorkSchema = z.strictObject({ raftId: z.guid().optional(), zoneId: z.guid().optional(), jobTypeId: z.guid(), employeeIds }).refine(raftOrZone, { path: ["raftId"] });
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).transform((v) => v.length === 5 ? `${v}:00` : v);
export const attendanceRoundingSchema = z.enum(["None", "Minutes15", "Minutes30", "Hour1"]);
export const attendanceRoundingMinutes = { None: 0, Minutes15: 15, Minutes30: 30, Hour1: 60 } as const;
/** A shift is the number of minutes of actual work that count as one; the tolerance is how many minutes short of a shift still count. Bounds follow the backend: 30 to 720 and 0 up to half a shift. */
export const SHIFT_MINUTES_MIN = 30, SHIFT_MINUTES_MAX = 720;
export const attendanceSettingsVersionSchema = z.object({ effectiveFrom: z.iso.date(), breakStart: clockTime.nullable(), breakEnd: clockTime.nullable(), roundingUnit: attendanceRoundingSchema,
  shiftMinutes: z.number().int(), shiftToleranceMinutes: z.number().int() });
export const attendanceSettingsSchema = z.object({ current: attendanceSettingsVersionSchema, versions: z.array(attendanceSettingsVersionSchema), rowVersion: z.string().min(1) });
export const attendanceSettingsSavedSchema = z.object({ settings: attendanceSettingsSchema, message: z.string(), messageCode: z.string() });
export const saveAttendanceSettingsSchema = z.strictObject({ effectiveFrom: z.iso.date(), breakStart: clockTime.nullable(), breakEnd: clockTime.nullable(), roundingUnit: attendanceRoundingSchema,
  shiftMinutes: z.number().int().min(SHIFT_MINUTES_MIN).max(SHIFT_MINUTES_MAX), shiftToleranceMinutes: z.number().int().min(0), rowVersion: z.string().min(1) })
  .refine((v) => v.breakStart === null && v.breakEnd === null || v.breakStart !== null && v.breakEnd !== null && v.breakStart < v.breakEnd)
  .refine((v) => v.shiftToleranceMinutes * 2 <= v.shiftMinutes);
