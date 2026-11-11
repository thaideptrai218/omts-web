import { z } from "zod";

/**
 * Shapes of the Sản phẩm module of the backend (api/products, api/product-categories, api/product-disposals), as the BFF at /api/products
 * hands them over. The base unit of a product is always kg: prices, stock and invoices are per kg; other units carry a factor in kg.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), num = z.number(), count = z.number().int(), numOpt = num.nullish();

export const IN_USE = 101, DISCONTINUED = 102;

export const productUnit = z.object({ id, unitId: id, name: text, factor: num, code: text, isBase: z.boolean(), salePrice: numOpt });
export const productRow = z.object({
  id, code: text, name: text, unitPrice: numOpt, statusId: count, status: text, rowVersion: text,
  categoryId: id.nullish(), categoryName: opt, unit: text, units: z.array(productUnit), description: opt, note: opt, photoUrl: opt,
  minKg: numOpt, maxKg: numOpt, onHandKg: numOpt, isUsed: z.boolean().nullish(), createdAt: text, createdBy: opt,
});
export const productPage = z.object({ items: z.array(productRow), page: count, pageSize: count, total: count, summary: z.object({ totalOnHandKg: num }).nullish() });
export const productView = productRow.extend({ photos: z.array(z.object({ id, url: text })).nullish() });
/** A save answers `{ product, message, messageCode }`; the door passes on the product alone. */
export const savedProduct = z.object({ product: productView }).transform((value) => value.product);
export const removedProduct = z.object({ id, code: text, removed: z.boolean() });
export const nextCode = z.object({ code: text });
export const importResult = z.object({ imported: count, errors: z.array(z.object({ row: count, fields: z.array(text), message: text })) });

/** The groups as the backend sends them (`productCount`), and as the screens use them (the same fields as an item group, `itemCount` being the products). */
export const productGroupRaw = z.object({ id, name: text, sortOrder: count, productCount: count, rowVersion: text, parentId: id.nullish() });
export const productGroup = productGroupRaw.transform(({ productCount, ...group }) => ({ ...group, itemCount: productCount }));

export const movementKinds = ["Harvest", "Sale", "Disposal", "Return", "Reversal"] as const;
export const productMovement = z.object({
  id, sequence: count.nullish(), kind: text, documentKind: text, documentId: id.nullish(), documentCode: opt, occurredAt: text, quantityKg: num, balanceAfterKg: numOpt,
  transactionPrice: numOpt, partyName: opt, partyCode: opt, harvestLotId: id.nullish(), lotCode: opt, reversesMovementId: id.nullish(),
});
export const productMovementPage = z.object({ items: z.array(productMovement), page: count, pageSize: count, total: count, unit: opt });
export const productLot = z.object({
  lotId: id, lotCode: text, zoneId: id.nullish(), zoneCode: opt, raftCode: opt, harvestDate: opt, harvestedAt: opt, lotStatusId: count.nullish(),
  harvestedKg: num, soldKg: num, disposedKg: num, returnedKg: num, remainingKg: num,
});
export const productLots = z.object({ productId: id, productCode: text, lots: z.array(productLot), totalRemainingKg: num });
export const priceChange = z.object({ id, unitId: id.nullish(), unitCode: opt, unitName: opt, oldPrice: numOpt, newPrice: num, changedAt: text, changedById: id.nullish(), changedBy: opt });

export const DISPOSAL = { draft: 4001, completed: 4002, cancelled: 4003 } as const;
export const disposalStatusLabel: Record<number, string> = { 4001: "Phiếu tạm", 4002: "Hoàn thành", 4003: "Đã hủy" };
export const disposalLine = z.object({ id, lineNumber: count, productId: id, productCode: text, productName: text, harvestLotId: id, lotCode: text, kg: num, note: opt });
const disposalHead = {
  id, code: text, statusId: count, status: text, disposedAt: text, zoneId: id, zoneCode: text, reason: opt, notes: opt, totalKg: num,
  createdAt: text, createdBy: opt, completedAt: opt, cancelledAt: opt, cancelReason: opt, rowVersion: text,
};
export const disposalRow = z.object(disposalHead);
export const disposalView = z.object({ ...disposalHead, lines: z.array(disposalLine) });
export const disposalPage = z.object({ items: z.array(disposalRow), page: count, pageSize: count, total: count, summary: z.object({ totalKg: num }).nullish() });

export type ProductUnit = z.infer<typeof productUnit>;
export type ProductRow = z.infer<typeof productRow>;
export type ProductPage = z.infer<typeof productPage>;
export type ProductView = z.infer<typeof productView>;
export type ProductGroup = z.infer<typeof productGroup>;
export type ProductMovement = z.infer<typeof productMovement>;
export type ProductMovementPage = z.infer<typeof productMovementPage>;
export type ProductLot = z.infer<typeof productLot>;
export type ProductLots = z.infer<typeof productLots>;
export type PriceChange = z.infer<typeof priceChange>;
export type ImportResult = z.infer<typeof importResult>;
export type DisposalLine = z.infer<typeof disposalLine>;
export type DisposalRow = z.infer<typeof disposalRow>;
export type DisposalView = z.infer<typeof disposalView>;
export type DisposalPage = z.infer<typeof disposalPage>;
