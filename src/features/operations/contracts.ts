import { z } from "zod";

const id = z.guid(), text = z.string(), nullableText = text.nullable(), number = z.number().finite();
const time = z.iso.datetime({ offset: true });
export const paymentMethod = z.enum(["Cash", "BankTransfer", "Other"]);
const supplier = z.object({ id, name: text, phoneNumber: text });
const zone = z.object({ id, code: text, name: text });
const raft = z.object({ id, code: text });
export const paged = <T extends z.ZodType>(row: T) => z.object({ items: z.array(row), page: z.number().int().positive(), pageSize: z.number().int().positive(), total: z.number().int().nonnegative() });
const receiptRow = z.object({ id, code: text, receiptDate: z.iso.date().nullable(), supplier, zone, raft: raft.nullable(), statusId: z.number().int(), status: text,
  subtotal: number, discount: number, payable: number, returned: number, paid: number, outstanding: number });
export const receiptSearchSchema = z.object({ page: paged(receiptRow), totals: z.object({ count: number, completedCount: number, subtotal: number,
  discount: number, payable: number, returned: number, paid: number, outstanding: number }), from: z.iso.date(), to: z.iso.date() });
export const receiptLineSchema = z.object({ id, itemId: id, itemCode: text, itemName: text, group: text, unit: text,
  quantity: number, unitPrice: number, lineAmount: number, supplierLotCode: nullableText, actualSource: nullableText,
  seedLotId: id.nullable(), seedLotCode: nullableText, stocked: number, returnedQuantity: number, returnable: number });
export const paymentSchema = z.object({ id, supplier, receiptId: id.nullable(), receiptCode: nullableText, amount: number,
  paymentDate: z.iso.date(), method: paymentMethod, referenceCode: nullableText, statusId: z.number().int(), status: text, cancelReason: nullableText });
const receiptPayment = z.object({ id, amount: number, paymentDate: z.iso.date(), method: paymentMethod, referenceCode: nullableText, statusId: z.number().int(), status: text });
const receiptReturn = z.object({ id, code: text, returnDate: z.iso.date(), reason: text, returnValue: number, refundAmount: number, debtReductionAmount: number });
export const receiptSchema = z.object({ id, code: text, supplier, zone, raft: raft.nullable(), receiptDate: z.iso.date().nullable(),
  subtotal: number, discountAmount: number, payable: number, returned: number, paid: number, refunded: number, outstanding: number,
  amountPaidNow: number, paidNowMethod: paymentMethod.nullable(), notes: nullableText, invoicePhotoUrls: z.array(text), statusId: z.number().int(), status: text,
  completedAt: time.nullable(), cancelledAt: time.nullable(), cancelReason: nullableText, copiedFromReceiptId: id.nullable(),
  lines: z.array(receiptLineSchema), payments: z.array(receiptPayment), returns: z.array(receiptReturn), rowVersion: text.min(1) });
export const returnSchema = z.object({ id, code: text, receiptId: id, receiptCode: text, returnDate: z.iso.date(), reason: text,
  refundAmount: number, refundMethod: paymentMethod.nullable(), debtReductionAmount: number, returnValue: number,
  lines: z.array(z.object({ receiptLineId: id, itemCode: text, itemName: text, unit: text, quantity: number, returnValue: number })) });
export const raftCostsSchema = z.array(z.object({ raft, zone, materialCost: number,
  receipts: z.array(z.object({ receiptId: id, code: text, receiptDate: z.iso.date(), materialCost: number })) }));
export const paymentSearchSchema = z.object({ page: paged(paymentSchema), totalAmount: number });
export const debtRowSchema = z.object({ supplierId: id, supplierName: text, payable: number, returned: number, paid: number, refunded: number, unallocated: number, outstanding: number });
export const debtsSchema = z.array(debtRowSchema);
export const debtSchema = z.object({ totals: debtRowSchema, receipts: z.array(z.object({ receiptId: id, code: text, receiptDate: z.iso.date(),
  payable: number, returned: number, paid: number, refunded: number, outstanding: number })) });

const account = z.object({ id, name: text });
const alert = z.enum(["None", "Active", "Corrected", "Voided"]);
export const thresholdsSchema = z.object({ phMin: number.nullable(), phMax: number.nullable(), salinityMin: number.nullable(), salinityMax: number.nullable() });
export const zoneThresholdsSchema = z.object({ zoneId: id, zoneCode: text, zoneName: text, zoneStatus: text, thresholds: thresholdsSchema });
const waterVersion = z.object({ id, recordVersion: z.number().int().positive(), status: text, statusCode: text, measuredAt: time, ph: number.nullable(), salinity: number.nullable(),
  alertState: alert, violatedValues: nullableText, correctionReason: nullableText, voidReason: nullableText, confirmedBy: account.nullable(), confirmedAt: time.nullable(), createdAt: time });
const editor = z.object({ accountId: id, name: text, startedAt: time });
export const editingSchema = z.object({ otherEditors: z.array(editor) });
const waterRow = z.object({ id, measuredAt: time, ph: number.nullable(), salinity: number.nullable(), measurementPoint: nullableText,
  status: text, statusCode: text, inputSource: z.enum(["Manual", "Ocr"]), alertState: alert, violatedValues: nullableText,
  measuredBy: account.nullable(), confirmedBy: account.nullable(), recordVersion: z.number().int().positive(), hasPhoto: z.boolean() });
export const waterHistorySchema = paged(waterRow);
export const waterSchema = z.object({ id, zoneId: id, zoneCode: text, zoneName: text, measurementPoint: nullableText, measuredAt: time,
  ph: number.nullable(), salinity: number.nullable(), status: text, statusCode: text, inputSource: z.enum(["Manual", "Ocr"]), photoUrl: nullableText,
  ocrDraft: z.object({ ph: number.nullable(), salinity: number.nullable(), measuredAt: time.nullable() }), thresholdsUsed: thresholdsSchema.nullable(),
  alertState: alert, thresholdExceeded: z.boolean(), violatedValues: nullableText, alertedAt: time.nullable(), measuredBy: account.nullable(),
  confirmedBy: account.nullable(), confirmedAt: time.nullable(), recordVersion: z.number().int().positive(), correctedFromMeasurementId: id.nullable(),
  correctionReason: nullableText, voidReason: nullableText, isLatestVersion: z.boolean(), versions: z.array(waterVersion), currentEditors: z.array(editor) });
const statistics = z.object({ average: number.nullable(), minimum: number.nullable(), maximum: number.nullable(), count: z.number().int().nonnegative() });
export const waterChartSchema = z.object({ zoneId: id, from: z.iso.date(), to: z.iso.date(), groupBy: z.enum(["Month", "Day"]), thresholds: thresholdsSchema,
  periods: z.array(z.object({ period: text, from: z.iso.date(), to: z.iso.date(), ph: statistics, salinity: statistics, missing: z.boolean() })) });
const recognizedNumber = z.object({ value: number, confidence: number.min(0).max(1), uncertain: z.boolean() }).nullable();
export const recognitionSchema = z.object({ measurement: waterSchema, ocr: z.object({ status: z.enum(["Success", "Failed", "NotCalled"]), ph: recognizedNumber, salinity: recognizedNumber,
  measuredAt: z.object({ value: time, confidence: number.min(0).max(1), uncertain: z.boolean() }).nullable() }) });
export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptSearch = z.infer<typeof receiptSearchSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type WaterMeasurement = z.infer<typeof waterSchema>;
export type WaterHistory = z.infer<typeof waterHistorySchema>;

const amount = number.min(0).max(100_000_000_000_000);
const reason = text.trim().min(1).max(1000);
export const saveReceiptSchema = z.strictObject({ supplierId: id, zoneId: id, raftId: id.nullable(), receiptDate: z.iso.date().nullable(),
  discountAmount: amount.nullable(), amountPaidNow: amount.nullable(), paidNowMethod: paymentMethod.nullable(), notes: text.max(1000).nullable(),
  lines: z.array(z.strictObject({ itemId: id, quantity: number.positive().max(1_000_000_000).nullable(), unitPrice: amount.nullable(),
    supplierLotCode: text.max(100).nullable(), actualSource: text.max(500).nullable() })).max(200), complete: z.boolean(), rowVersion: text.min(1).nullable() });
export const completeReceiptSchema = z.strictObject({ rowVersion: text.min(1) });
export const cancelReceiptSchema = completeReceiptSchema.extend({ reason, cancelPayments: z.boolean().nullable() });
export const saveReturnSchema = z.strictObject({ returnDate: z.iso.date(), reason, refundAmount: amount, refundMethod: paymentMethod.nullable(), debtReductionAmount: amount,
  lines: z.array(z.strictObject({ receiptLineId: id, quantity: number.positive() })).min(1).max(200) });
export const recordPaymentSchema = z.strictObject({ supplierId: id, receiptId: id, amount: amount.positive(), paymentDate: z.iso.date(), method: paymentMethod,
  referenceCode: text.max(100).nullable(), deduplicationKey: z.uuid() });
export const allocatePaymentSchema = z.strictObject({ receiptId: id });
const waterValues = { measuredAt: time.nullable(), ph: number.min(0).max(14).nullable(), salinity: number.min(0).max(100).nullable() };
export const recordWaterSchema = z.strictObject({ ...waterValues, clientOperationId: z.uuid(), confirm: z.boolean() });
export const confirmWaterSchema = z.strictObject(waterValues);
export const correctWaterSchema = confirmWaterSchema.extend({ reason, recordVersion: z.number().int().positive() });
export const voidWaterSchema = z.strictObject({ reason, recordVersion: z.number().int().positive() });
export const setThresholdsSchema = z.strictObject({ phMin: number.min(0).max(14).nullable(), phMax: number.min(0).max(14).nullable(),
  salinityMin: number.min(0).max(100).nullable(), salinityMax: number.min(0).max(100).nullable() }).refine((v) =>
  (v.phMin === null && v.phMax === null || v.phMin !== null && v.phMax !== null && v.phMin < v.phMax)
  && (v.salinityMin === null && v.salinityMax === null || v.salinityMin !== null && v.salinityMax !== null && v.salinityMin < v.salinityMax));
