import { z } from "zod";

/** Hợp đồng dữ liệu của báo cáo sản lượng nuôi (HARVEST-04, GET api/harvest-yield). Enum backend trả dạng chuỗi. */
const date = z.iso.date(), kg = z.number();
/** Trường backend bổ sung 11/11/2026: thiếu thì coi như chưa có số liệu (không phải 0). */
const optionalKg = z.number().nullable().optional();
export const groupingSchema = z.enum(["Raft", "Zone", "Cycle"]);
export type Grouping = z.infer<typeof groupingSchema>;

export const yieldLot = z.object({
  id: z.guid(), lotCode: z.string(), harvestDate: date, inPeriod: z.boolean(),
  raftId: z.guid(), raftCode: z.string(), zoneId: z.guid(), zoneCode: z.string(), cycleId: z.guid(),
  statusId: z.number(), status: z.string(),
  estimatedKg: kg, invoicedKg: kg, returnedKg: kg, soldKg: kg, lostKg: kg, differenceKg: kg, notFinal: z.boolean(),
  cageCount: z.number().nullable().optional(), remainingKg: optionalKg,
});

export const yieldGroup = z.object({
  key: z.guid(), label: z.string(), zoneId: z.guid(), zoneCode: z.string(), zoneName: z.string(),
  raftId: z.guid().nullable(), raftCode: z.string().nullable(),
  cycleId: z.guid().nullable(), cycleStartDate: date.nullable(), cycleCloseDate: date.nullable(), cycleStatus: z.string().nullable(),
  lotCount: z.number().int(), estimatedKg: kg, soldKg: kg, lostKg: kg, differenceKg: kg, notFinal: z.boolean(),
  harvestedCages: z.number().nullable().optional(), targetYieldKg: optionalKg, remainingKg: optionalKg, availableKg: optionalKg,
  seedQuantity: optionalKg, seedUnit: z.string().nullable().optional(),
  lots: z.array(yieldLot),
});

export const yieldTotals = z.object({ lotCount: z.number().int(), estimatedKg: kg, soldKg: kg, lostKg: kg, differenceKg: kg, notFinal: z.boolean(), harvestedCages: z.number().nullable().optional() });

export const harvestYieldReport = z.object({
  from: date, to: date, groupBy: groupingSchema, groups: z.array(yieldGroup), totals: yieldTotals,
  notFinalNotice: z.string().nullable(), notFinalNoticeCode: z.string().nullable(), message: z.string().nullable(), messageCode: z.string().nullable(),
});

export type YieldLot = z.infer<typeof yieldLot>;
export type YieldGroup = z.infer<typeof yieldGroup>;
export type YieldTotals = z.infer<typeof yieldTotals>;
export type HarvestYieldReport = z.infer<typeof harvestYieldReport>;

/** Tham số gửi qua BFF: groupBy chữ thường, zoneIds ngăn cách bằng dấu phẩy (BFF mở thành tham số lặp cho backend). */
export const groupingValue = (g: Grouping) => g.toLowerCase() as "raft" | "zone" | "cycle";
export const groupingLabel: Record<Grouping, string> = { Raft: "Bè", Zone: "Vùng nuôi", Cycle: "Chu kỳ" };
