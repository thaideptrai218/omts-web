import { z } from "zod";

/**
 * Shapes of the Vật tư & Giống module of the backend (items, units, groups, settings, movements, seed lots, issues), as the BFF at
 * /api/input-items hands them over. Quantities are in the unit they are shown in unless named base; times are ISO-8601 with offset.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), num = z.number(), count = z.number().int(), numOpt = num.nullish();

export const itemTypes = [["Seed", "Giống"], ["Material", "Vật tư"], ["Other", "Khác"]] as const;
export type ItemType = (typeof itemTypes)[number][0];
export const typeLabel = (value: string | null | undefined) => itemTypes.find(([key]) => key === value)?.[1] ?? "Khác";
export const IN_USE = 101, DISCONTINUED = 102;

export const unitView = z.object({ id, unitId: id, name: text, factor: num, code: text, isBase: z.boolean(), isUsed: z.boolean().nullish() });
export const itemRow = z.object({
  id, code: text, name: text, group: text, itemGroupId: id.nullish(), itemGroupName: opt, unit: text, units: z.array(unitView), description: opt, notes: opt, photoUrl: opt,
  minQuantity: numOpt, maxQuantity: numOpt, costPrice: numOpt, lastPurchasePrice: numOpt, onHand: num, stockValue: num, isUsed: z.boolean().nullish(),
  statusId: count, status: text, createdAt: text, createdBy: opt, rowVersion: text,
});
export const itemPage = z.object({ items: z.array(itemRow), page: count, pageSize: count, total: count, summary: z.object({ stockValue: num }).nullish() });
export const itemView = itemRow.extend({ photos: z.array(z.object({ id, url: text })).nullish(), hasMovements: z.boolean().nullish(), openingQuantity: numOpt });
export const itemList = z.array(itemRow);
export const importResult = z.object({ imported: count, errors: z.array(z.object({ row: count, fields: z.array(text), message: text })) });
export const nextCode = z.object({ code: text });
export const removedItem = z.object({ disposalId: id.nullish(), disposalCode: opt, disposedQuantity: numOpt });
export const removed = z.object({ done: z.literal(true) });

export const inputUnit = z.object({ id, name: text, itemCount: count, isUsed: z.boolean().nullish(), rowVersion: text });
/** `itemCount` of a parent group includes the items of its child groups; `parentId` is empty for a top-level group (two levels at most). */
export const inputGroup = z.object({ id, name: text, sortOrder: count, itemCount: count, rowVersion: text, parentId: id.nullish() });
export const settings = z.object({ costMethod: z.enum(["Fixed", "Average"]), allowNegativeQuantity: z.boolean(), rowVersion: text });
export const issueType = z.object({ id, name: text, isSystem: z.boolean(), rowVersion: text });

export const movementKinds = ["Opening", "Receipt", "PurchaseReturn", "Issue", "Disposal", "Reversal"] as const;
export const movement = z.object({
  id, sequence: count.nullish(), kind: text, documentId: id.nullish(), documentCode: opt, occurredAt: text, quantity: num, balanceAfter: numOpt, unitCost: numOpt, transactionPrice: numOpt,
  partyName: opt, seedLotLineId: id.nullish(), seedLotCode: opt, reversesMovementId: id.nullish(),
});
export const movementPage = z.object({ items: z.array(movement), page: count, pageSize: count, total: count, unit: opt });
export const seedLots = z.object({
  lots: z.array(z.object({ seedLotLineId: id, code: text, receiptId: id.nullish(), receiptCode: opt, receivedAt: opt, supplierName: opt, supplierLotCode: opt, receivedQuantity: num, onHand: num })),
  unlottedQuantity: num, suggestedLotId: id.nullish(), unit: opt,
});

export const priceSetup = z.object({
  receiptId: id, receiptCode: text,
  lines: z.array(z.object({ itemId: id, itemCode: text, itemName: text, unit: text, receiptPrice: numOpt, costPrice: numOpt, lastPurchasePrice: numOpt })),
});

export const ISSUE = { draft: 3801, completed: 3802, cancelled: 3803 } as const;
export const issueStatusLabel: Record<number, string> = { 3801: "Phiếu tạm", 3802: "Hoàn thành", 3803: "Đã hủy" };
export type IssueKind = "Use" | "Disposal";
export const issueLine = z.object({
  id, lineNumber: count, itemId: id, itemCode: text, itemName: text, group: opt, itemUnitId: id.nullish(), unit: text, unitFactor: num, quantity: num, baseQuantity: numOpt, baseUnit: opt,
  seedLotLineId: id.nullish(), seedLotCode: opt, unitCost: numOpt, value: numOpt, note: opt,
});
const issueHead = {
  id, kind: z.enum(["Use", "Disposal"]), code: text, statusId: count, status: text, issuedAt: text, zoneId: id.nullish(), zoneCode: opt, raftId: id.nullish(), raftCode: opt,
  issueTypeId: id.nullish(), issueTypeName: opt, receiverEmployeeId: id.nullish(), receiverName: opt, reason: opt, notes: opt, totalValue: num, createdAt: text, createdBy: opt,
  completedAt: opt, cancelledAt: opt, cancelReason: opt, rowVersion: text,
};
export const issueRow = z.object(issueHead);
export const issueView = z.object({ ...issueHead, lines: z.array(issueLine) });
export const issuePage = z.object({ items: z.array(issueRow), page: count, pageSize: count, total: count, summary: z.object({ totalValue: num }).nullish() });
export const receivers = z.array(z.object({ id, fullName: text }));

export type UnitView = z.infer<typeof unitView>;
export type ItemRow = z.infer<typeof itemRow>;
export type ItemPage = z.infer<typeof itemPage>;
export type ItemView = z.infer<typeof itemView>;
export type ImportResult = z.infer<typeof importResult>;
export type InputUnit = z.infer<typeof inputUnit>;
export type InputGroup = z.infer<typeof inputGroup>;
export type InventorySettings = z.infer<typeof settings>;
export type IssueType = z.infer<typeof issueType>;
export type Movement = z.infer<typeof movement>;
export type MovementPage = z.infer<typeof movementPage>;
export type SeedLots = z.infer<typeof seedLots>;
export type PriceSetup = z.infer<typeof priceSetup>;
export type IssueLine = z.infer<typeof issueLine>;
export type IssueRow = z.infer<typeof issueRow>;
export type IssueView = z.infer<typeof issueView>;
export type IssuePage = z.infer<typeof issuePage>;

/** What a failed call may tell on top of its message code (the BFF passes on only this allow-listed part of the problem). */
export const problemExtras = z.object({
  field: z.string().max(60).optional(), fields: z.array(z.string().max(60)).max(20).optional(), existingId: id.optional(),
  references: z.array(z.object({ name: z.string().max(100), count })).max(20).optional(),
  message: z.string().max(400).optional(), itemId: id.optional(), seedLotLineId: id.nullish(), balanceAfter: num.optional(),
});
export type Problem = z.infer<typeof problemExtras>;

/** Names a field in the backend's words for the one-line error of a form. */
export const fieldNames: Record<string, string> = {
  Code: "Mã", Name: "Tên", Group: "Loại hàng", "Item group": "Nhóm hàng", Unit: "Đơn vị tính", Units: "Đơn vị tính", "Unit code": "Mã đơn vị", Photos: "Ảnh",
  "Min quantity": "Định mức tối thiểu", "Max quantity": "Định mức tối đa", "Cost price": "Giá vốn", "Opening quantity": "Còn lại ban đầu", Description: "Mô tả", Notes: "Ghi chú",
  Zone: "Vùng", Raft: "Bè", "Issue type": "Loại xuất", Receiver: "Người nhận", "Issued at": "Thời gian", Reason: "Lý do", Lines: "Hàng xuất", "Disposal fields": "Vùng, bè, loại xuất, người nhận",
  Ids: "Thứ tự", Parent: "Nhóm cha",
};
