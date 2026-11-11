import { z } from "zod";
import { ownerResponseSchema } from "@/features/trader-purchases/contracts";

/** Trạng thái yêu cầu mua (StatusIds.PurchaseRequest): bộ lọc `statusId` của GET /api/purchase-requests. "Hoàn thành" chỉ là cờ `fulfilled`, không có mã riêng. */
export const REQUEST_STATUS_FILTERS = ["3201", "3202", "3203", "3204"] as const;
export const requestStatusFilterSchema = z.enum(REQUEST_STATUS_FILTERS);
const customerSchema = z.object({ id: z.guid(), name: z.string(), phoneNumber: z.string().nullable(), currentDebt: z.number() });
export const requestSendingSchema = z.object({ channel: z.string(), phoneNumber: z.string().nullable(), deliveryStatusId: z.number().int().nullable(), deliveryStatus: z.string().nullable(), deliveryStatusAt: z.iso.datetime({ offset: true }).nullable() });
/** PurchaseRequestView của backend (kg, không có lồng/nhân lực). */
export const purchaseRequestSchema = z.object({ id: z.guid(), customer: customerSchema, productId: z.guid(), productName: z.string(), requestedKg: z.number(), pickupDate: z.iso.date(), note: z.string().nullable(),
  sentAt: z.iso.datetime({ offset: true }), statusId: z.number().int(), status: z.string(), fulfilled: z.boolean(), response: ownerResponseSchema.nullable(), cancelReason: z.string().nullable(),
  cancelledAt: z.iso.datetime({ offset: true }).nullable(), sendings: z.array(requestSendingSchema), rowVersion: z.string() });
export const purchaseRequestPageSchema = z.object({ items: z.array(purchaseRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
const requestText = z.string().max(1000);
const acceptedKg = z.number().positive().max(999_999_999_999_999).refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6);
/** POST /api/purchase-requests/{id}/accept (AcceptPurchaseRequest): chỉ Chủ HTX. */
export const acceptRequestSchema = z.strictObject({ acceptedKg, pickupDate: z.iso.date(), payLaterAgreed: z.boolean(), note: requestText.nullable(), rowVersion: z.string().min(1) });
/** POST /api/purchase-requests/{id}/decline (DeclinePurchaseRequest): lý do bắt buộc. */
export const declineRequestSchema = z.strictObject({ note: requestText.refine((v) => v.trim().length > 0), rowVersion: z.string().min(1) });

export const salesProductSchema = z.object({ id: z.guid(), code: z.string(), name: z.string(), description: z.string().nullable(), inUse: z.boolean(), availableForPurchase: z.boolean(), rowVersion: z.string() });

export const assignmentSchema = z.object({ id: z.guid(), employeeId: z.guid(), employeeName: z.string(), zoneId: z.guid(), raftId: z.guid().nullable(), raftCode: z.string().nullable(),
  jobTypeId: z.guid().nullable(), job: z.string(), date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable() });
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export const saveProductSchema = z.strictObject({ code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(200), description: z.string().max(2000).nullable(), inUse: z.boolean(), rowVersion: z.string().min(1).nullable() });
export const leaveSchema = z.object({ id: z.guid(), employeeName: z.string(), from: z.iso.date(), to: z.iso.date(), reason: z.string(), approved: z.boolean().nullable(), response: z.string().nullable(), rowVersion: z.string(), cancelledAt: z.iso.datetime({ offset: true }).nullable() });
const periodSchema = z.object({ jobTypeId: z.guid(), job: z.string(), raft: z.string().nullable(), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), minutes: z.number() });
const attendanceDaySchema = z.object({ date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable(), periods: z.array(periodSchema), jobs: z.array(z.object({ jobTypeId: z.guid(), job: z.string(), hours: z.number() })), complete: z.boolean() });
export const myWorkSchema = z.object({ employeeId: z.guid().nullable(), name: z.string().nullable(), assignments: z.array(assignmentSchema), attendance: z.array(attendanceDaySchema), requests: z.array(leaveSchema) });
export const requestLeaveSchema = z.strictObject({ from: z.iso.date(), to: z.iso.date(), reason: z.string().trim().min(1).max(500), clientOperationId: z.uuid() }).refine((v) => v.to >= v.from);
export const reviewLeaveSchema = z.strictObject({ approved: z.boolean(), response: z.string().max(500), rowVersion: z.string().min(1) }).refine((v) => v.approved || !!v.response.trim());
export const workforceLookupsSchema = z.object({ jobs: z.array(z.object({ id: z.guid(), name: z.string() })), employees: z.array(z.object({ id: z.guid(), name: z.string(), onLeave: z.boolean() })) });
const employeeIds = z.array(z.guid()).min(1).max(100).refine((v) => new Set(v).size === v.length);
export const assignWorkSchema = z.strictObject({ raftId: z.guid(), jobTypeId: z.guid(), date: z.iso.date(), employeeIds, moveExisting: z.boolean() });
export const crewWorkSchema = z.strictObject({ raftId: z.guid(), jobTypeId: z.guid(), employeeIds });
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).transform((v) => v.length === 5 ? `${v}:00` : v);
export const attendanceRoundingSchema = z.enum(["None", "Minutes15", "Minutes30", "Hour1"]);
export const attendanceRoundingMinutes = { None: 0, Minutes15: 15, Minutes30: 30, Hour1: 60 } as const;
export const attendanceSettingsVersionSchema = z.object({ effectiveFrom: z.iso.date(), breakStart: clockTime.nullable(), breakEnd: clockTime.nullable(), roundingUnit: attendanceRoundingSchema });
export const attendanceSettingsSchema = z.object({ current: attendanceSettingsVersionSchema, versions: z.array(attendanceSettingsVersionSchema), rowVersion: z.string().min(1) });
export const attendanceSettingsSavedSchema = z.object({ settings: attendanceSettingsSchema, message: z.string(), messageCode: z.string() });
export const saveAttendanceSettingsSchema = z.strictObject({ effectiveFrom: z.iso.date(), breakStart: clockTime.nullable(), breakEnd: clockTime.nullable(), roundingUnit: attendanceRoundingSchema, rowVersion: z.string().min(1) })
  .refine((v) => v.breakStart === null && v.breakEnd === null || v.breakStart !== null && v.breakEnd !== null && v.breakStart < v.breakEnd);
