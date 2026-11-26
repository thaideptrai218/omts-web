import type { WaterThresholds } from "@/features/zones-api/zone-water-model";

export type WaterIndicator = "ph" | "salinity" | "temperature";
/** One value beyond its limit: `bound` is the limit it crossed (the maximum when high, the minimum when low). */
export type WaterViolation = { indicator: WaterIndicator; value: number; direction: "High" | "Low"; bound: number | null };

const NAMES: Record<WaterIndicator, string> = { ph: "pH", salinity: "Độ mặn", temperature: "Nhiệt độ" };
const UNITS: Record<WaterIndicator, string> = { ph: "", salinity: " ‰", temperature: " °C" };
const num = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** The backend names indicators in English (pH, Salinity, Temperature); anything else is not one of the three. */
export function indicatorOf(name: string): WaterIndicator | undefined {
  const key = name.trim().toLowerCase();
  return key === "ph" ? "ph" : key === "salinity" ? "salinity" : key === "temperature" ? "temperature" : undefined;
}

/** "pH 14 cao hơn mức cho phép 8,5", "Độ mặn 10 ‰ thấp hơn mức cho phép 18 ‰". */
export function violationText(violation: WaterViolation): string {
  const unit = UNITS[violation.indicator], word = violation.direction === "High" ? "cao hơn" : "thấp hơn";
  return `${NAMES[violation.indicator]} ${num(violation.value)}${unit} ${word} mức cho phép${violation.bound === null ? "" : ` ${num(violation.bound)}${unit}`}`;
}

/** "Vượt ngưỡng: a · b · c"; empty when nothing is outside. */
export function violationSentence(violations: readonly WaterViolation[]): string {
  return violations.length ? `Vượt ngưỡng: ${violations.map(violationText).join(" · ")}` : "";
}

type OutsideItem = { indicator: string; unit?: string | null; value: number; direction: "High" | "Low"; min: number | null; max: number | null };
/** Violations from the structured list the backend sends with a measurement. */
export function violationsFromOutside(items: readonly OutsideItem[]): WaterViolation[] {
  return items.flatMap(item => {
    const indicator = indicatorOf(item.indicator);
    return indicator ? [{ indicator, value: item.value, direction: item.direction, bound: item.direction === "High" ? item.max : item.min }] : [];
  });
}

/** Violations of three readings against the limits they are judged with; a missing limit judges nothing. */
export function violationsAgainst(values: Record<WaterIndicator, number | null>, limits: WaterThresholds): WaterViolation[] {
  const bounds: Record<WaterIndicator, [number | null, number | null]> = {
    ph: [limits.phMin, limits.phMax], salinity: [limits.salinityMin, limits.salinityMax], temperature: [limits.temperatureMin, limits.temperatureMax] };
  return (Object.keys(bounds) as WaterIndicator[]).flatMap((indicator): WaterViolation[] => {
    const value = values[indicator], [min, max] = bounds[indicator];
    if (value === null || !Number.isFinite(value)) return [];
    if (min !== null && value < min) return [{ indicator, value, direction: "Low", bound: min }];
    if (max !== null && value > max) return [{ indicator, value, direction: "High", bound: max }];
    return [];
  });
}

const TOKEN = /^\s*(ph|salinity|temperature)\s+(-?\d+(?:[.,]\d+)?)\s*([<>])\s*(-?\d+(?:[.,]\d+)?)\s*$/i;
const parse = (text: string) => Number(text.replace(",", "."));
/**
 * Fallback for a record that carries only the backend sentence ("pH 14.00 > 8.50; Salinity 10.00 < 18.00"): `>` means the value is
 * above the maximum, `<` below the minimum. A part that does not read this way is dropped, never shown as English text.
 */
export function violationsFromText(text: string | null | undefined): WaterViolation[] {
  return (text ?? "").split(";").flatMap(part => {
    const match = TOKEN.exec(part), indicator = match && indicatorOf(match[1]);
    return match && indicator ? [{ indicator, value: parse(match[2]), direction: match[3] === ">" ? "High" as const : "Low" as const, bound: parse(match[4]) }] : [];
  });
}

type Judged = { ph: number; salinity: number; temperature: number; thresholdsUsed: WaterThresholds; valuesOutside?: readonly OutsideItem[]; violatedValues: string | null };

/** The violations of a recorded measurement: the structured list first, then its values against the limits it was judged with, then the backend sentence. */
export function measurementViolations(record: Judged): WaterViolation[] {
  const listed = violationsFromOutside(record.valuesOutside ?? []);
  if (listed.length) return listed;
  const derived = violationsAgainst({ ph: record.ph, salinity: record.salinity, temperature: record.temperature }, record.thresholdsUsed);
  return derived.length ? derived : violationsFromText(record.violatedValues);
}

/** The line shown for a flagged measurement: the sentence, or just "Vượt ngưỡng" when the details cannot be read. */
export function measurementViolationLine(record: Judged): string {
  return violationSentence(measurementViolations(record)) || (record.violatedValues ? "Vượt ngưỡng" : "");
}
