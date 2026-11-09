import { z } from "zod";

/** Giá trị nằm ngoài ngưỡng (backend WaterValueOutside): chỉ số, giá trị, hướng lệch và khoảng cho phép. */
export const valueOutsideSchema = z.object({
  indicator: z.string(),
  value: z.number(),
  unit: z.string().nullable(),
  direction: z.enum(["High", "Low"]),
  min: z.number().nullable(),
  max: z.number().nullable(),
});

/** Một vùng trong tổng quan chất lượng nước (WATER-03 bước 1). */
export const zoneOverviewItemSchema = z.object({
  zoneId: z.guid(),
  zoneCode: z.string(),
  zoneName: z.string(),
  zoneStatus: z.string(),
  zoneStatusCode: z.string(),
  latestMeasuredAt: z.iso.datetime({ offset: true }).nullable(),
  hasWaterAlert: z.boolean(),
  valuesOutside: z.array(valueOutsideSchema),
});

export const zoneOverviewSchema = z.array(zoneOverviewItemSchema);

export type ValueOutside = z.infer<typeof valueOutsideSchema>;
export type ZoneOverviewItem = z.infer<typeof zoneOverviewItemSchema>;
