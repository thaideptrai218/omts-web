import { z } from "zod";
import { historyEntry } from "@/features/history/history-contracts";

const text = z.string(), number = z.number().finite(), nullableNumber = number.nullish().transform(value => value ?? null);
const photo = z.object({ id: text, url: text });
export const seedLotSchema = z.object({ id: text, code: text, receiptId: text.nullish(), receiptCode: text.nullish(),
  itemName: text, unit: text, supplierName: text.nullish(), onHand: number.optional() });
const nurseryRowFields = { id: text, code: text, zoneId: text, zoneCode: text, zoneName: text,
  seedLotCode: text.optional(), itemName: text.optional(), quantityIn: number, startDate: text, daysNursing: number,
  statusId: number.optional(), status: text.default(""), statusLabel: text.optional(), survivors: nullableNumber, lossPieces: nullableNumber, lossPercent: nullableNumber,
  seeded: number.nullish().transform(value => value ?? 0), remaining: number.nullish(),
  closedOn: text.nullish().transform(value => value ?? null), closeLossPieces: nullableNumber, rowVersion: text };
// Keep identifiers/version required; tolerate rollout additions and absent inventory fields.
function normalizeInventory<T extends z.infer<ReturnType<typeof rowObject>>>(row: T) {
  const statuses: Record<string, number> = { Nursing: 4001, Completed: 4002, Cancelled: 4003, Closed: 4004 };
  const statusId = row.statusId ?? statuses[row.status] ?? 0;
  return { ...row, statusId, remaining: statusId === 4002 ? Math.max(0, row.remaining ?? (row.survivors ?? 0) - row.seeded) : 0 };
}
function rowObject() { return z.object(nurseryRowFields); }
export const nurseryRowSchema = rowObject().transform(normalizeInventory);
export const nurseryUsageSchema = z.object({ cycleId: text, cycleCode: text.nullish(), raftId: text, raftCode: text,
  seeded: number.nullish().transform(value => value ?? 0), lastSeedingOn: text.nullish() });
export const nurseryDetailSchema = z.object({ ...nurseryRowFields, seedLot: seedLotSchema, seedLotOnHand: nullableNumber,
  note: text.nullish(), completedOn: text.nullish(), issueId: text.nullish(), issueCode: text.nullish(), cancelReason: text.nullish(),
  recordedByName: text.nullish(), startPhotos: z.array(photo).default([]), completionPhotos: z.array(photo).default([]),
  usage: z.array(nurseryUsageSchema).nullish().transform(value => value ?? []),
  canEdit: z.boolean().default(false), canComplete: z.boolean().default(false), canCorrectSurvivors: z.boolean().default(false) }).transform(normalizeInventory);
export const nurseryListSchema = z.object({ items: z.array(nurseryRowSchema), page: number, pageSize: number, total: number });
export const nurseryLotsSchema = z.object({ lots: z.array(seedLotSchema), message: text.nullish() });
export const nurseryHistorySchema = z.object({ entries: z.array(historyEntry.extend({ actionLabel: text.nullish(),
  changes: z.array(z.object({ field: text, label: text.nullish(), from: z.union([text, number, z.boolean()]).nullish(),
    to: z.union([text, number, z.boolean()]).nullish(), unit: text.nullish() })).default([]) })) });
export type NurseryRow = z.infer<typeof nurseryRowSchema>;
export type NurseryDetail = z.infer<typeof nurseryDetailSchema>;
export type NurseryLot = z.infer<typeof seedLotSchema>;
export const nurseryStatus = (statusId: number | undefined) => ({ 4001: "Đang ươm", 4002: "Đã ươm xong", 4003: "Đã hủy", 4004: "Đã đóng" })[statusId ?? 0] ?? "Không xác định";
export const nurseryStatusTone = (statusId: number) => statusId === 4001 ? "neutral" : statusId === 4002 ? "success" : statusId === 4003 ? "danger" : "neutral";
export const quantityText = (value: number | null | undefined, unit = "mảnh") => value == null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${unit}`;
