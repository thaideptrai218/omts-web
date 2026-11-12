import { z } from "zod";
export const lanePercentValues = z.record(z.string().regex(/^[1-9]\d{0,2}$/), z.number().positive().max(100).multipleOf(0.01));
export const lanePercentRead = z.record(z.string(), z.number()).nullish();

/** Only selected lanes enter the multipart JSON field; omitted harvest values remain unknown. */
export function selectedLanePercents(lanes: number[], drafts: Record<string, string>, defaultValue?: number) {
  return Object.fromEntries(lanes.flatMap(lane => {
    const value = drafts[lane];
    return value === undefined && defaultValue === undefined || value === "" ? [] : [[String(lane), Number(value ?? defaultValue)]];
  }));
}
export function lanePercentsProblem(lanes: number[], drafts: Record<string, string>, defaultValue?: number): string | undefined {
  const result = lanePercentValues.safeParse(selectedLanePercents(lanes, drafts, defaultValue));
  if (!result.success) return "Phần trăm từng làn phải lớn hơn 0 đến 100, tối đa 2 số thập phân.";
  if (defaultValue !== undefined && lanes.some(lane => drafts[lane] === "")) return "Nhập phần trăm cho từng làn đã chọn.";
}
