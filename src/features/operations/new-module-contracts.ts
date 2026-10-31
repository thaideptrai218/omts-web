import { z } from "zod";

export const salesProductSchema = z.object({ id: z.guid(), code: z.string(), name: z.string(), description: z.string().nullable(), inUse: z.boolean(), availableForPurchase: z.boolean(), rowVersion: z.string() });
export const requestStatusSchema = z.enum(["AWAITING_RESPONSE", "ACCEPTED", "DECLINED", "CANCELLED"]);
export const purchaseRequestSchema = z.object({ id: z.guid(), code: z.string(), productId: z.guid(), productName: z.string(), quantityUnit: z.literal("Cage"),
  requestedCages: z.number().int().positive(), requestedPickupDate: z.iso.date(), note: z.string().nullable(), status: requestStatusSchema,
  acceptedCages: z.number().int().positive().nullable(), acceptedPickupDate: z.iso.date().nullable(), allowPayLater: z.boolean(), responseNote: z.string().nullable(),
  respondedAt: z.iso.datetime({ offset: true }).nullable(), cancelledAt: z.iso.datetime({ offset: true }).nullable(), cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }), customerName: z.string(), rowVersion: z.string() });
export const purchaseRequestPageSchema = z.object({ items: z.array(purchaseRequestSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
export const assignmentSchema = z.object({ id: z.guid(), employeeId: z.guid(), employeeName: z.string(), zoneId: z.guid(), raftId: z.guid().nullable(), raftCode: z.string().nullable(),
  jobTypeId: z.guid().nullable(), job: z.string(), date: z.iso.date(), checkedInAt: z.iso.datetime({ offset: true }).nullable(), checkedOutAt: z.iso.datetime({ offset: true }).nullable() });
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export const saveProductSchema = z.strictObject({ code: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(200), description: z.string().max(2000).nullable(), inUse: z.boolean(), rowVersion: z.string().min(1).nullable() });
export const createRequestSchema = z.strictObject({ productId: z.guid(), requestedCages: z.number().int().positive().max(2147483647), pickupDate: z.iso.date(), note: z.string().max(500).nullable(), clientOperationId: z.uuid() });
export const respondRequestSchema = z.strictObject({ accept: z.boolean(), acceptedCages: z.number().int().positive().max(2147483647).nullable(), pickupDate: z.iso.date().nullable(), allowPayLater: z.boolean(), note: z.string().max(500).nullable(), rowVersion: z.string().min(1) })
  .refine((v) => v.accept ? v.acceptedCages !== null && v.pickupDate !== null : !!v.note?.trim());
export const cancelRequestSchema = z.strictObject({ reason: z.string().max(500).nullable(), rowVersion: z.string().min(1) });
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
export const attendanceSettingsSchema = z.object({ id: z.guid(), effectiveFrom: z.iso.date(), breakFrom: z.string().nullable(), breakTo: z.string().nullable(), roundingMinutes: z.number().int() });
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).transform((v) => v.length === 5 ? `${v}:00` : v);
export const saveAttendanceSettingsSchema = z.strictObject({ effectiveFrom: z.iso.date(), breakFrom: clockTime.nullable(), breakTo: clockTime.nullable(), roundingMinutes: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(60)]) }).refine((v) => v.breakFrom === null && v.breakTo === null || v.breakFrom !== null && v.breakTo !== null && v.breakFrom < v.breakTo);
