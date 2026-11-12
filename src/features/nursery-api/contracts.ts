import { z } from "zod";
import { historyEntry } from "@/features/history/history-contracts";

const text = z.string(), number = z.number(), nullableNumber = number.nullish();
const photo = z.object({ id: text, url: text });
export const seedLotSchema = z.object({ id: text, code: text, receiptId: text.nullish(), receiptCode: text.nullish(),
  itemName: text, unit: text, supplierName: text.nullish(), onHand: number.optional() });
export const nurseryRowSchema = z.object({ id: text, code: text, zoneId: text, zoneCode: text, zoneName: text,
  seedLotCode: text.optional(), itemName: text.optional(), quantityIn: number, startDate: text, daysNursing: number,
  statusId: number, status: text, statusLabel: text.optional(), survivors: nullableNumber, lossPieces: nullableNumber, lossPercent: nullableNumber,
  rowVersion: text });
export const allocationSchema = z.object({ id: text, raftId: text, raftCode: text, cycleId: text,
  quantity: number, seeded: number.default(0), remaining: number.optional(), targetYieldKg: nullableNumber, canChange: z.boolean().default(false) });
export const nurseryDetailSchema = nurseryRowSchema.extend({ seedLot: seedLotSchema, seedLotOnHand: nullableNumber,
  note: text.nullish(), completedOn: text.nullish(), issueId: text.nullish(), issueCode: text.nullish(), cancelReason: text.nullish(),
  recordedByName: text.nullish(), startPhotos: z.array(photo).default([]), completionPhotos: z.array(photo).default([]),
  allocations: z.array(allocationSchema).default([]), canEdit: z.boolean().default(false), canComplete: z.boolean().default(false), canCorrectSurvivors: z.boolean().default(false) });
export const nurseryListSchema = z.object({ items: z.array(nurseryRowSchema), page: number, pageSize: number, total: number });
export const nurseryLotsSchema = z.object({ lots: z.array(seedLotSchema), message: text.nullish() });
export const nurseryHistorySchema = z.object({ entries: z.array(historyEntry.extend({ actionLabel: text.nullish(),
  changes: z.array(z.object({ field: text, label: text.nullish(), from: z.union([text, number, z.boolean()]).nullish(),
    to: z.union([text, number, z.boolean()]).nullish(), unit: text.nullish() })).default([]) })) });
export type NurseryRow = z.infer<typeof nurseryRowSchema>;
export type NurseryDetail = z.infer<typeof nurseryDetailSchema>;
export type NurseryLot = z.infer<typeof seedLotSchema>;
export type AllocationInput = { raftId: string; quantity: number; targetYieldKg?: number };
export const nurseryStatus = (statusId: number | undefined) => ({ 4001: "Đang ươm", 4002: "Đã hoàn tất", 4003: "Đã hủy" })[statusId ?? 0] ?? "Không xác định";
export const quantityText = (value: number | null | undefined, unit = "mảnh") => value == null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${unit}`;
