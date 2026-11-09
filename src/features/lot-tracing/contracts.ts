import { z } from "zod";

/**
 * Hợp đồng đọc của Truy xuất lô hàng (SCR-TRACE-01) khớp backend develop:
 * GET /api/harvest-lots/trace-search, /{id}/trace, /{id}/publish-check, POST /{id}/publish.
 * Enum backend là chuỗi (JsonStringEnumConverter). Chuỗi thông điệp tiếng Anh của backend không được dùng để hiển thị.
 */
const id = z.guid(), at = z.iso.datetime({ offset: true }), day = z.iso.date(), kg = z.number();

export const originState = z.enum(["NotPublished", "Published", "Withdrawn"]);
export const gapKind = z.enum(["NoSeedingSession", "SeedLotNotOnCompletedReceipt", "NotPublisherOfZone"]);
/** Một mục thiếu dữ liệu nguồn gốc (MSG-TRACE-01/02) dạng giá trị nguyên tử để Web tự diễn đạt. */
export const originGap = z.object({ kind: gapKind, laneNumber: z.number().int().nullable(), seedLotCodes: z.array(z.string()), zoneCode: z.string().nullable() });

export const searchItem = z.object({
  id, lotCode: z.string(), harvestedAt: at, harvestDate: day, raftId: id, raftCode: z.string(), zoneId: id, zoneCode: z.string(), statusId: z.number().int(), status: z.string(), originState,
});
export const searchResult = z.object({ lots: z.array(searchItem), message: z.string().nullable(), messageCode: z.string().nullable() });

export const correctionMark = z.object({ correctedAt: at, actorAccountId: id.nullable(), actorName: z.string().nullable(), reason: z.string().nullable() });
const seedLot = z.object({ id, code: z.string(), receiptCode: z.string(), receivedDate: day, itemName: z.string().nullable(), supplierName: z.string() });
const traceSeeding = z.object({
  seedingRecordId: id, seedingDate: day, quantity: kg, seedLot, receiptStatus: z.string(), onCompletedReceipt: z.boolean(), corrections: z.array(correctionMark),
});
const traceLane = z.object({ laneNumber: z.number().int(), isFinished: z.boolean(), seedings: z.array(traceSeeding) });
const invoiceLine = z.object({ lineNumber: z.number().int(), productName: z.string(), kg, unitPrice: z.number().nullable(), amount: z.number().nullable() });
const salesReturn = z.object({ id, code: z.string(), returnDate: day, kg, outcome: z.string() });
const traceInvoice = z.object({
  invoiceId: id, invoiceCode: z.string(), invoiceDate: day, zoneCode: z.string(), customerName: z.string().nullable(), customerPhone: z.string().nullable(), walkIn: z.boolean(), kg,
  lines: z.array(invoiceLine), returns: z.array(salesReturn),
});

export const lotTrace = z.object({
  lotId: id, lotCode: z.string(), harvestedAt: at, harvestDate: day, cageCount: z.number().int(), estimatedKg: kg, statusId: z.number().int(), status: z.string(), originState,
  publishedAt: at.nullable(), withdrawnAt: at.nullable(), corrections: z.array(correctionMark), raftId: id, raftCode: z.string(), zoneId: id, zoneCode: z.string(), zoneName: z.string(),
  cycleId: id, cycleStartDate: day, cycleCloseDate: day.nullable(), cycleStatus: z.string(), lanes: z.array(traceLane), missing: z.array(originGap),
  invoices: z.array(traceInvoice), invoicedKg: kg, canPublish: z.boolean(), canCorrect: z.boolean(), canExport: z.boolean(),
});

export const publishBlock = z.enum(["NoRight", "AlreadyPublished", "NotOnSalesInvoice", "OwnerOnly"]);
export const publishCheck = z.object({
  lotId: id, lotCode: z.string(), originState, onSalesInvoice: z.boolean(), canPublish: z.boolean(), block: publishBlock.nullable(), republish: z.boolean(), ready: z.boolean(), missing: z.array(originGap),
});
/** Kết quả công bố: chỉ cần lô và cờ công bố lại; câu thông báo do Web tự viết. */
export const published = z.object({ lot: z.object({ id, lotCode: z.string(), originState }), republished: z.boolean() });

export type SearchItem = z.infer<typeof searchItem>;
export type LotTrace = z.infer<typeof lotTrace>;
export type OriginGap = z.infer<typeof originGap>;
export type PublishCheck = z.infer<typeof publishCheck>;
export type OriginState = z.infer<typeof originState>;
export type CorrectionMark = z.infer<typeof correctionMark>;
