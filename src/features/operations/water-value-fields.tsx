"use client";
import { UnitField } from "@/components/form/number-fields";
import { backdateWindow } from "@/shared/format/backdate-window";
import { indicatorRange, type WaterThresholds } from "@/features/zones-api/zone-water-model";
import { Field, businessToday, businessTime } from "./ui";
import { violationText, violationsAgainst, type WaterIndicator } from "./water-violation-text";

type Values = { measuredAt: string; ph: string; salinity: string; temperature: string };
type Change = (key: "measuredAt" | "ph" | "salinity" | "temperature", value: string) => void;

/** Owner decision 11/11/2026: salinity 0-50 ‰, temperature 0-45 °C, pH 0-14; a measurement may be backdated at most 30 days. These are sanity limits of the input, not the zone's alert thresholds. */
export const WATER_LIMITS = { ph: { min: 0, max: 14 }, salinity: { min: 0, max: 50 }, temperature: { min: 0, max: 45 } } as const;

const reading = (text: string) => text.trim() === "" || !Number.isFinite(Number(text)) ? null : Number(text);

/**
 * Date-time plus the three unit-labelled readings. The labels give the alert thresholds of the chosen zone; a value beyond them
 * shows a red note under its field but can still be saved (the measurement is then recorded with an alert).
 */
export function WaterValueFields({ values, onChange, thresholds, required = true }: { values: Values; onChange: Change; thresholds?: WaterThresholds; required?: boolean }) {
  const range = backdateWindow(businessToday());
  const outside = thresholds ? violationsAgainst({ ph: reading(values.ph), salinity: reading(values.salinity), temperature: reading(values.temperature) }, thresholds) : [];
  const measuredAt = (
    <Field label="Thời điểm đo (giờ Việt Nam) *" type="datetime-local" required={required} min={`${range.min}T00:00`} max={businessTime()} value={values.measuredAt} onChange={(event) => onChange("measuredAt", event.target.value)} />
  );
  const field = (key: WaterIndicator, name: string, unit: string) => {
    const limits = thresholds && indicatorRange(thresholds, key), violation = outside.find(item => item.indicator === key);
    return <div key={`water-${key}`}>
      <UnitField label={`${name}${limits ? ` (ngưỡng vùng ${limits})` : ""} *`} unit={unit} decimals={2} min={WATER_LIMITS[key].min} max={WATER_LIMITS[key].max} required={required} value={values[key]} onChange={(next) => onChange(key, next)} />
      {violation && <p role="status" className="mt-1 text-xs font-medium text-danger">{violationText(violation)}. Vẫn có thể lưu.</p>}
    </div>;
  };
  return <>
    {measuredAt}
    {field("ph", "pH", "pH")}
    {field("salinity", "Độ mặn", "‰")}
    {field("temperature", "Nhiệt độ", "°C")}
  </>;
}
