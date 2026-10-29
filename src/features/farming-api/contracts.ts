import { z } from "zod";

const id = z.guid(), day = z.iso.date(), text = z.string(), nullableText = text.nullable();
const zone = z.object({ id, code: text, name: text });
export const licenseTypes = [
  ["SEA_AREA_ALLOCATION", "Quyết định giao khu vực biển"], ["AQUACULTURE_LICENSE", "Giấy phép nuôi trồng thủy sản"],
  ["FOOD_SAFETY_COMMITMENT", "Cam kết an toàn thực phẩm"], ["OTHER", "Giấy tờ khác"],
] as const;
const documentType = z.enum(licenseTypes.map(([code]) => code));
const state = z.enum(["Valid", "ExpiringSoon", "Expired", "NotYetEffective", "Superseded", "Missing"]);
export const licenseSchema = z.object({ id, documentType, documentTypeName: text, documentNumber: text,
  effectiveDate: day.nullable(), expiryDate: day.nullable(), issuingAuthority: nullableText, holder: nullableText, legalScope: nullableText,
  asOf: day, state, zones: z.array(zone), replacesDocumentId: id.nullable(), replacedByDocumentId: id.nullable(), fileUrl: nullableText, rowVersion: text.min(1) });
export type License = z.infer<typeof licenseSchema>;
export const licenseOverviewSchema = z.object({ zoneId: id, asOf: day, licenses: z.array(z.object({ documentType, documentTypeName: text, state,
  documentId: id.nullable(), documentNumber: nullableText, effectiveDate: day.nullable(), expiryDate: day.nullable(), isReplaced: z.boolean() })) });
export type LicenseOverview = z.infer<typeof licenseOverviewSchema>;
export const saveLicenseSchema = z.strictObject({ documentType, documentNumber: text.trim().min(1).max(100), effectiveDate: day,
  expiryDate: day.nullable(), issuingAuthority: text.trim().max(200).nullable(), holder: text.trim().max(200).nullable(), legalScope: text.trim().max(1000).nullable(),
  zoneIds: z.array(id).min(1).refine((ids) => new Set(ids).size === ids.length), rowVersion: text.min(1).optional() })
  .refine((value) => !value.expiryDate || value.expiryDate > value.effectiveDate, { path: ["expiryDate"], message: "Ngày hết hạn phải sau ngày hiệu lực." });
export const raftSchema = z.object({ id, zone, code: text, latitude: z.number().nullable(), longitude: z.number().nullable(), location: nullableText, size: nullableText,
  conditionNotes: nullableText, photoUrl: nullableText, statusId: z.number().int(), status: text, layoutVersion: z.number().int().nonnegative(),
  lanes: z.array(z.object({ id, laneNumber: z.number().int().positive(), length: z.number().nullable(), markerA: nullableText, markerB: nullableText })),
  layoutDrawing: z.json().nullable(), layoutVersions: z.array(z.object({ versionNumber: z.number().int(), laneCount: z.number().int(), validFrom: day, validTo: day.nullable() })),
  materialCost: z.number().nullable(), rowVersion: text.min(1) });
export type Raft = z.infer<typeof raftSchema>;
const segment = z.object({ id, type: z.enum(["Seeded", "PlannedHarvest", "Harvested", "WrittenOff"]), from: z.number(), to: z.number(), date: day,
  recordedBy: nullableText, confirmedBy: nullableText, seedingEventId: id.nullable(), seedLotCode: nullableText, harvestEventId: id.nullable(), lotId: id.nullable(), writeOffReason: nullableText });
export const conditionSchema = z.object({ raftId: id, raftCode: text, date: day, cycleId: id.nullable(), layoutVersion: z.number().int().nonnegative(),
  lanes: z.array(z.object({ laneNumber: z.number().int().positive(), length: z.number().nonnegative(), summary: z.enum(["NotSeeded", "Growing", "PartiallyHarvested", "FullyHarvested"]),
    portions: z.array(z.object({ from: z.number().nonnegative(), to: z.number().nonnegative(), condition: z.enum(["NotSeeded", "Growing", "Harvested", "WrittenOff"]), segments: z.array(segment) })), plannedHarvests: z.array(segment) })) });
export type Condition = z.infer<typeof conditionSchema>;
export const stateLabel = (value: string) => ({ Valid: "Còn hiệu lực", ExpiringSoon: "Sắp hết hạn", Expired: "Hết hạn", NotYetEffective: "Chưa có hiệu lực", Superseded: "Đã thay thế", Missing: "Thiếu hồ sơ",
  NotSeeded: "Chưa thả", Growing: "Đang nuôi", Harvested: "Đã thu", WrittenOff: "Đã ghi giảm", PartiallyHarvested: "Thu một phần", FullyHarvested: "Đã thu hết", Seeded: "Thả giống", PlannedHarvest: "Dự kiến thu" }[value] ?? value);
export const licenseTypeLabel = (value: string) => licenseTypes.find(([code]) => code === value)?.[1] ?? value;
