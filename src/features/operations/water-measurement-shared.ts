import type { z } from "zod";
import * as c from "./contracts";
import { createOperationsRepository } from "./repository";

/** Single water-operations repository shared by every water screen component. */
export const waterRepository = createOperationsRepository("water");

export type WaterRecognition = z.infer<typeof c.recognitionSchema>["ocr"];
export type WaterChartData = z.infer<typeof c.waterChartSchema>;
export type WaterZoneThresholds = z.infer<typeof c.zoneThresholdsSchema>;

/** Converts optional numeric form text to the API value: empty string means "not measured". */
export function toOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

/** Vietnamese number display for measured values, with an em dash when missing. */
export function formatMeasuredValue(value: number | null | undefined) {
  return value?.toLocaleString("vi-VN") ?? "—";
}
