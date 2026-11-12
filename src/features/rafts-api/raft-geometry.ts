import { z } from "zod";
import { parseRaftSize } from "./raft-size";

/** Optional additions preserve compatibility with existing raft responses. */
export const raftGeometryFields = {
  lengthM: z.number().min(1).max(500).nullish(), widthM: z.number().min(1).max(200).nullish(),
  areaM2: z.number().nonnegative().nullish(), totalLineLengthM: z.number().nonnegative().nullish(), damagedLaneCount: z.number().int().nonnegative().optional(), outOfServiceLaneCount: z.number().int().nonnegative().optional(),
};
export const raftLaneFields = {
  lineLengthM: z.number().positive().nullish(), lineLengthOverridden: z.boolean().optional(), isOutOfService: z.boolean().optional(), outOfServiceOn: z.string().nullish(),
  isDamaged: z.boolean().optional(), state: z.string().optional(),
};
export const laneLineSchema = z.strictObject({ laneNumber: z.number().int().min(1).max(200), lineLengthM: z.number().min(1).max(500).nullable() });
export const raftGeometryRequest = z.strictObject({ lengthM: z.number().min(1).max(500).optional(), widthM: z.number().min(1).max(200).optional(),
  laneLengths: z.array(laneLineSchema).max(200).optional() }).superRefine((value, ctx) => {
  const precise = (number: number) => Math.abs(number * 100 - Math.round(number * 100)) < 0.000001;
  for (const key of ["lengthM", "widthM"] as const) if (value[key] != null && !precise(value[key]))
    ctx.addIssue({ code: "custom", path: [key], message: "Tối đa 2 chữ số thập phân." });
  const seen = new Set<number>();
  for (const line of value.laneLengths ?? []) {
    if (seen.has(line.laneNumber) || (line.lineLengthM != null && (line.lineLengthM > (value.lengthM ?? 500) || !precise(line.lineLengthM))))
      ctx.addIssue({ code: "custom", path: ["laneLengths"], message: "Độ dài làn không hợp lệ." });
    seen.add(line.laneNumber);
  }
});
export const areaOf = (length: number, width: number) => Math.round(length * width * 100) / 100;
export const geometryOf = (value: { lengthM?: number | null; widthM?: number | null; size?: string | null }) => {
  const old = parseRaftSize(value.size);
  return { length: value.lengthM ?? old?.length, width: value.widthM ?? old?.width };
};
export const laneOverrides = (text: string): Record<string, string> => {
  try { const parsed = z.record(z.string(), z.string()).safeParse(JSON.parse(text)); return parsed.success ? parsed.data : {}; } catch { return {}; }
};
/** Physical numbers retained at a tail-only count change; draft text never allocates an unbounded preview. */
export function retainedLaneNumbers(count: number, lanes: readonly { laneNumber: number; statusId: number }[] = []) {
  const bounded = Math.min(200, Math.max(0, Math.floor(count) || 0));
  const active = lanes.filter(lane => lane.statusId !== 2002).sort((a, b) => a.laneNumber - b.laneNumber);
  const maximum = Math.max(0, ...active.map(lane => lane.laneNumber));
  return new Set([...active.slice(0, bounded).map(lane => String(lane.laneNumber)),
    ...Array.from({ length: Math.max(0, bounded - active.length) }, (_, index) => String(maximum + index + 1))]);
}
