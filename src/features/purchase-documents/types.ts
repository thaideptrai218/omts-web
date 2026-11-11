import type { ReceiptRow, ReturnRow } from "./contracts";

export const RECEIPT = { draft: 1701, completed: 1702, cancelled: 1703 } as const;
export const RETURN = { recorded: 1901, cancelled: 1902, draft: 1903 } as const;

export const receiptStatusLabel: Record<number, string> = { 1701: "Phiếu tạm", 1702: "Đã nhập hàng", 1703: "Đã hủy" };
export const returnStatusLabel: Record<number, string> = { 1901: "Đã trả hàng", 1902: "Đã hủy", 1903: "Phiếu tạm" };
export const itemGroups = [["Seed", "Giống"], ["Material", "Vật tư"], ["Other", "Khác"]] as const;
export type ItemGroup = (typeof itemGroups)[number][0];

export type SupplierOption = { id: string; code: string; name: string; phone: string };
export type ZoneRef = { id: string; name: string };
export type RaftOption = { id: string; code: string; zoneId: string; zoneName: string };
/** One unit an item is counted in: `factor` base units make one of it (the base unit is 1). */
export type ItemUnit = { id: string; name: string; factor: number; code: string; isBase: boolean };
export type ItemOption = { id: string; code: string; name: string; unit: string; group: ItemGroup; units: ItemUnit[] };
/** The units a line may pick from; an item missing from the catalogue lists (discontinued) keeps just the unit its line already has. */
export function unitChoices(item: ItemOption, current?: { itemUnitId: string | null; unit: string; unitFactor: number }): ItemUnit[] {
  if (item.units.length) return item.units;
  return current?.itemUnitId ? [{ id: current.itemUnitId, name: current.unit, factor: current.unitFactor, code: "", isBase: current.unitFactor === 1 }] : [];
}
/** The base unit of an item (what its quantities on hand are counted in). */
export const baseUnitOf = (item: ItemOption) => item.units.find((unit) => unit.isBase) ?? item.units[0];
export type PaymentMethod = "Cash" | "BankTransfer" | "Other";
export type { ReceiptRow, ReturnRow };

export type ReceiptLine = {
  id: string; item: ItemOption; quantity: number | null; unitPrice: number | null; raft: RaftOption | null;
  /** The unit the line was typed in and how many base units it holds; `seeded`, `returned` and `returnable` are in base units. */
  itemUnitId: string | null; unitFactor: number;
  supplierLotCode: string | null; seedLotCode: string | null; seeded: number; returned: number; returnable: number; discount: number;
  /** What was actually paid per unit: (unit price − line discount) with the receipt's header discount spread by amount. */
  netUnitPrice: number;
};
export type ReceiptPayment = { id: string; code: string; date: string; createdBy: string; method: PaymentMethod; statusLabel: string; amount: number };
export type ReceiptReturnRef = { id: string; code: string; date: string; returnedAt: string | null; reason: string; value: number; statusId: number };

export type Receipt = {
  id: string; code: string; date: string; receivedAt: string; receivedBy: { id: string; name: string } | null; completedAt: string | null; rowVersion: string;
  supplier: SupplierOption; zone: ZoneRef | null; recordedBy: string; statusId: number; discount: number; payable: number; paid: number; notes: string | null;
  cancelReason: string | null; lines: ReceiptLine[]; returns: ReceiptReturnRef[];
};
/** A line amount: quantity × (unit price − per-unit discount), rounded half up to the dong like the backend. */
export const lineAmount = (line: { quantity: number | null; unitPrice: number | null; discount?: number | null }) => Math.round((line.quantity ?? 0) * Math.max(0, (line.unitPrice ?? 0) - (line.discount ?? 0)));
export const goodsTotal = (lines: readonly { quantity: number | null; unitPrice: number | null; discount?: number | null }[]) => lines.reduce((sum, line) => sum + lineAmount(line), 0);

export type ReceiptDraft = {
  id?: string; rowVersion?: string; code: string; receivedAt: string; receivedById: string; supplierId: string; discount: number; notes: string;
  /** `lineId` keeps an existing line of a completed receipt; a line without it is new, and existing lines left out are removed. */
  lines: { lineId: string | null; itemId: string; itemUnitId: string | null; quantity: number | null; unitPrice: number | null; discount: number; supplierLotCode: string }[];
};

export type ReturnLine = { id: string; receiptLineId: string | null; item: ItemOption; itemUnitId: string | null; unitFactor: number; quantity: number; unitPrice: number };
export type ReturnRefund = { code: string; amount: number; method: PaymentMethod; bankReference: string | null };
export type PurchaseReturn = {
  id: string; code: string; date: string; returnedAt: string; rowVersion: string; receipt: { id: string; code: string } | null;
  supplier: SupplierOption; zone: ZoneRef | null; recordedBy: string; statusId: number; reason: string; discount: number; value: number; netValue: number;
  refund: ReturnRefund | null; cancelReason: string | null; lines: ReturnLine[];
};

export type ReturnDraft = {
  id?: string; rowVersion?: string; code: string; returnedAt: string; receiptId: string | null; supplierId: string; reason: string; discount: number; ownerApproved: boolean;
  refund: { amount: number; method: PaymentMethod; bankReference: string } | null;
  lines: { receiptLineId: string | null; itemId: string; itemUnitId: string | null; quantity: number; unitPrice: number }[];
};

export type Page<T> = { items: T[]; page: number; total: number };
export type ReceiptQuery = { search: string; statusId: string; group: string; supplierId: string; from: string; to: string; sortBy: string; sortDir: "asc" | "desc"; page: number; pageSize: number };
export type ReceiptTotals = { received: number; returned: number; net: number };
export type ReturnQuery = { search: string; statusId: string; source: string; supplierId: string; from: string; to: string; sortBy: string; sortDir: "asc" | "desc"; page: number; pageSize: number };
export type CancelPreview = { canCancel: boolean; blockedBy: string | null; debtBefore: number; debtAfter: number };
