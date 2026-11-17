import { z } from "zod";
import { raftGeometryFields, raftLaneFields } from "@/features/rafts-api/raft-geometry";

const id = z.guid(), day = z.iso.date(), text = z.string(), nullableText = text.nullable();
const zone = z.object({ id, code: text, name: text });
export const licenseTypes = [
  ["SEA_AREA_ALLOCATION", "Quyết định giao khu vực biển"], ["AQUACULTURE_LICENSE", "Giấy phép nuôi trồng thủy sản"],
  ["FOOD_SAFETY_COMMITMENT", "Cam kết an toàn thực phẩm"], ["OTHER", "Giấy tờ khác"],
] as const;
const documentType = z.enum(licenseTypes.map(([code]) => code));
const state = z.enum(["Valid", "ExpiringSoon", "Expired", "NotYetEffective", "Replaced", "Missing"]);
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
export const raftSchema = z.object({ ...raftGeometryFields, id, zone, code: text, latitude: z.number().nullable(), longitude: z.number().nullable(), location: nullableText, size: nullableText,
  conditionNotes: nullableText, photos: z.array(z.object({ id, sortOrder: z.number().int(), url: text })).max(3), statusId: z.number().int(), status: text, laneCount: z.number().int().nonnegative(),
  lanes: z.array(z.object({ id, laneNumber: z.number().int().positive(), statusId: z.number().int(), status: text, ...raftLaneFields })),
  materialCost: z.number().nullable(), rowVersion: text.min(1) });
export type Raft = z.infer<typeof raftSchema>;
/** Answer of a raft photo add: the raft plus the message the backend attaches to every save. */
export const raftSavedSchema = z.object({ raft: raftSchema, message: text, messageCode: text });
export const stateLabel = (value: string) => ({ Valid: "Còn hiệu lực", ExpiringSoon: "Sắp hết hạn", Expired: "Hết hạn", NotYetEffective: "Chưa có hiệu lực", Replaced: "Đã thay thế", Missing: "Thiếu hồ sơ",
  NotSeeded: "Chưa thả", Growing: "Đang nuôi", Harvested: "Đã thu", WrittenOff: "Đã ghi giảm", PartiallyHarvested: "Thu một phần", FullyHarvested: "Đã thu hết", Seeded: "Thả giống", PlannedHarvest: "Dự kiến thu" }[value] ?? value);
export const licenseTypeLabel = (value: string) => licenseTypes.find(([code]) => code === value)?.[1] ?? value;
