import "server-only";
import { z } from "zod";
import { historyChange, historyEntry } from "@/features/history/history-contracts";

const number = z.number().finite();
const text = z.string().nullish();
const photo = z.object({ id: z.string(), url: z.string() });
const lot = z.object({ id: z.string(), code: z.string(), receiptId: text, receiptCode: text,
  receivedDate: text, itemId: text, itemCode: text, itemName: z.string(), unit: z.string(),
  supplierId: text, supplierName: text, onHand: number.optional(), quantityReceived: number.optional(),
  quantitySeeded: number.optional(), quantityReturned: number.optional(), quantityConsumed: number.optional() });
// V2 nursery pool: seeded/remaining/closing figures are tolerated when absent (the client derives safe defaults).
const common = {
  id: z.string(), code: z.string(), zoneId: z.string(), zoneCode: z.string(), zoneName: z.string(),
  quantityIn: number, unit: z.string().default("mảnh"), startDate: z.string(), daysNursing: number,
  statusId: number.optional(), status: z.string(), statusLabel: z.string().optional(), completedOn: text,
  survivors: number.nullish(), lossPieces: number.nullish(), lossPercent: number.nullish(),
  seeded: number.nullish(), remaining: number.nullish(), closedOn: text, closeLossPieces: number.nullish(),
  estimated: z.boolean().optional(), rowVersion: z.string(),
};
export const nurseryList = z.object({ items: z.array(z.object({ ...common, seedLotCode: z.string(),
  itemName: text, supplierName: text })),
  page: number, pageSize: number, total: number,
  summary: z.object({ quantityIn: number.optional(), nursingQuantityIn: number.optional(), completedQuantityIn: number.optional(),
    survivors: number.nullish(), lossPieces: number.nullish(), lossPercent: number.nullish(), nursingCount: number.optional(), completedCount: number.optional(),
    closedCount: number.optional(), remaining: number.nullish() }).optional(),
});
/** Cycles/rafts currently drawing seed from this batch. */
const usage = z.object({ cycleId: z.string(), cycleCode: text, cycleStartDate: text, cycleStatus: text, raftId: z.string(), raftCode: z.string(),
  seeded: number.nullish(), lastSeedingOn: text });
export const nurseryDetail = z.object({ ...common, seedLot: lot, seedLotOnHand: number,
  note: text, issueId: text, issueCode: text, cancelReason: text, cancelledAt: text,
  recordedByAccountId: text, recordedByName: text, createdAt: text,
  startPhotos: z.array(photo).default([]), completionPhotos: z.array(photo).default([]),
  usage: z.array(usage).nullish(),
  canEdit: z.boolean().default(false), canComplete: z.boolean().default(false), canCorrectSurvivors: z.boolean().default(false), canClose: z.boolean().optional(),
});
export const nurserySaved = z.object({ batch: nurseryDetail });
export const nurseryLots = z.object({ zoneId: z.string(), lots: z.array(lot.extend({ onHand: number })), message: text, messageCode: text });
export const nurseryHistory = z.object({ recordType: z.string(), recordId: z.string(), recordCode: text,
  entries: z.array(historyEntry.extend({ eventId: text, byRoleCode: text, actionCode: text, actionLabel: text,
    changes: z.array(historyChange.extend({ unit: text })).default([]) })) });
export type NurseryDetail = z.infer<typeof nurseryDetail>;

/** Only approved photo routes reach the browser; upstream file addresses remain server-side. */
export function nurseryBrowserPhotos(batch: NurseryDetail) {
  const map = (stage: "start" | "completion", photos: NurseryDetail["startPhotos"]) => photos.map(photo => ({ ...photo,
    url: `/api/nursery?${new URLSearchParams({ action: "photo", id: batch.id, zoneId: batch.zoneId, stage, photoId: photo.id })}` }));
  return { ...batch, startPhotos: map("start", batch.startPhotos), completionPhotos: map("completion", batch.completionPhotos) };
}
