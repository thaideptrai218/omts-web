import type { z } from "zod";
import * as c from "./contracts";
import { businessTime, toApiTime } from "./ui";

/** Form text of a measurement correction (WATER-02): every value plus the reason, nothing else is editable. */
export type WaterDraft = { raftId: string; measuredAt: string; ph: string; salinity: string; temperature: string; reason: string };

export type WaterCorrection = z.infer<typeof c.correctWaterSchema>;

export const draftOf = (record: c.WaterMeasurement): WaterDraft => ({
  raftId: record.raftId, measuredAt: businessTime(record.measuredAt), ph: String(record.ph), salinity: String(record.salinity), temperature: String(record.temperature), reason: "",
});

const number = (text: string) => text.trim() === "" ? Number.NaN : Number(text);

/** The request body for a correction, or `undefined` when a value is empty or outside what the backend accepts. */
export function correctionBody(draft: WaterDraft): WaterCorrection | undefined {
  const parsed = c.correctWaterSchema.safeParse({
    raftId: draft.raftId, measuredAt: toApiTime(draft.measuredAt) ?? "", ph: number(draft.ph), salinity: number(draft.salinity), temperature: number(draft.temperature), reason: draft.reason,
  });
  return parsed.success ? parsed.data : undefined;
}

export const CORRECTION_INVALID = "Kiểm tra lại: chọn bè, nhập thời điểm đo, pH từ 0 đến 14, độ mặn từ 0 đến 100 ‰, nhiệt độ từ 0 đến 100 °C và lý do hiệu chỉnh.";
