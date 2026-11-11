import { z } from "zod";
import { originState } from "./contracts";

/**
 * Hợp đồng Sửa dữ liệu truy xuất (SCR-TRACE-02 / TRACE-03) khớp backend develop:
 * GET /api/rafts/{id}/trace-corrections, /api/cultivation-cycles/{id}/trace-corrections,
 * POST .../trace-correction/preview, PUT .../trace-correction (JSON cho phiên thả giống, multipart cho nhật ký và lô thu hoạch).
 */
const id = z.guid(), day = z.iso.date(), numbers = z.array(z.number().int().positive().max(999)).max(100);
const reason = z.string().trim().min(1).max(1000);
const distinct = (values: number[]) => new Set(values).size === values.length;

export const cycleItem = z.object({ id, startDate: day, closeDate: day.nullable(), status: z.string(), closedEarly: z.boolean() });
export const correctionCycles = z.object({ raftId: id, raftCode: z.string(), cycles: z.array(cycleItem), needsOwnerApproval: z.boolean() });

const seedLotRef = z.object({ id, code: z.string(), receiptCode: z.string(), itemName: z.string().nullable(), supplierName: z.string() });
export const seedingItem = z.object({ id, seedingDate: day, seedLot: seedLotRef, quantity: z.number(), laneNumbers: numbers, lotCodes: z.array(z.string()), rowVersion: z.string() });
export const logItem = z.object({
  id, visitDate: day, notes: z.string().nullable(), photos: z.array(z.object({ key: z.string(), sortOrder: z.number() })), recordedByName: z.string().nullable(), rowVersion: z.string(),
});
export const lotItem = z.object({
  id, lotCode: z.string(), harvestedAt: z.string(), harvestDate: day, laneNumbers: numbers, finishedLaneNumbers: numbers, cageCount: z.number(), kgPerCage: z.number(),
  estimatedKg: z.number(), status: z.string(), originState, rowVersion: z.string(),
});
export const correctionRecords = z.object({
  cycleId: id, raftId: id, raftCode: z.string(), cycleStatus: z.string(), startDate: day, closeDate: day.nullable(),
  seedingRecords: z.array(seedingItem), cultivationLogs: z.array(logItem), harvestLots: z.array(lotItem), needsOwnerApproval: z.boolean(),
});

/** Danh sách lô giống chọn được khi sửa phiên thả giống (GET /api/rafts/{id}/seed-lots). */
export const seedLotOptions = z.object({ lots: z.array(z.object({ id, code: z.string(), itemName: z.string().nullable(), supplierName: z.string() })) });
/** Khóa ảnh hiện có của lô thu hoạch: cần gửi lại để giữ ảnh khi sửa (ảnh không gửi lại bị xóa). */
export const lotPhotoKeys = z.object({ photos: z.array(z.object({ key: z.string(), sortOrder: z.number() })) });

export const preview = z.object({
  recordType: z.string(), recordId: id, before: z.record(z.string(), z.unknown()), after: z.record(z.string(), z.unknown()).nullable(), changedFields: z.array(z.string()),
  affectedLots: z.array(z.object({ id, lotCode: z.string(), originState })), affectedPublishedLotCodes: z.array(z.string()), needsOwnerApproval: z.boolean(), rowVersion: z.string(),
});
export const corrected = z.object({ affectedPublishedLotCodes: z.array(z.string()).default([]) });
export const logCorrected = z.object({ log: z.object({ id }) });
/** Nhật ký không ảnh hưởng lô nào (BR-TRACE-05): cùng dạng kết quả với hai loại còn lại. */
export const logSaved = logCorrected.transform(() => ({ affectedPublishedLotCodes: [] as string[] }));

const seedingBase = { seedingDate: day, seedLotId: id, laneNumbers: numbers.min(1), quantity: z.number().positive().max(100_000_000), reason };
export const seedingPreviewBody = z.strictObject(seedingBase).refine((v) => distinct(v.laneNumbers));
export const seedingSaveBody = z.strictObject({ ...seedingBase, rowVersion: z.string().min(1), ownerApproved: z.boolean() }).refine((v) => distinct(v.laneNumbers));

const lotBase = {
  laneNumbers: numbers.min(1), finishedLaneNumbers: numbers, cageCount: z.number().positive().max(100_000), estimatedKg: z.number().positive().max(100_000_000).nullable(),
  keepPhotoKeys: z.array(z.string().min(1)).max(10), reason,
};
const lotRule = (v: { laneNumbers: number[]; finishedLaneNumbers: number[] }) => distinct(v.laneNumbers) && distinct(v.finishedLaneNumbers) && v.finishedLaneNumbers.every((n) => v.laneNumbers.includes(n));
export const lotPreviewBody = z.strictObject(lotBase).refine(lotRule);
/** Dữ liệu multipart (payload JSON) của sửa lô thu hoạch; ảnh mới đi kèm dưới dạng tệp. */
export const lotSavePayload = z.strictObject({ ...lotBase, rowVersion: z.string().min(1), ownerApproved: z.boolean() }).refine(lotRule);
/** Dữ liệu multipart của sửa nhật ký nuôi; nhật ký không có phiên bản (lần lưu sau cùng thắng). */
export const logSavePayload = z.strictObject({
  visitDate: day, notes: z.string().trim().max(2000).nullable(), keepPhotoKeys: z.array(z.string().min(1)).max(10), reason, ownerApproved: z.boolean(),
});

export type CycleItem = z.infer<typeof cycleItem>;
export type CorrectionRecords = z.infer<typeof correctionRecords>;
export type SeedingItem = z.infer<typeof seedingItem>;
export type LogItem = z.infer<typeof logItem>;
export type LotItem = z.infer<typeof lotItem>;
export type Preview = z.infer<typeof preview>;
