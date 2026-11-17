"use client";
import { UnitField } from "@/components/form/number-fields";
import { backdateWindow } from "@/shared/format/backdate-window";
import { Field, businessToday, businessTime } from "./ui";

type Values = { measuredAt: string; ph: string; salinity: string; temperature: string };
type Change = (key: "measuredAt" | "ph" | "salinity" | "temperature", value: string) => void;

/** Owner decision 11/11/2026: salinity 0-50 ‰, temperature 0-45 °C, pH 0-14; a measurement may be backdated at most 30 days. */
export const WATER_LIMITS = { ph: { min: 0, max: 14 }, salinity: { min: 0, max: 50 }, temperature: { min: 0, max: 45 } } as const;

/** Date-time plus the three unit-labelled readings; the same inputs serve the new measurement and the in-place correction. */
export function WaterValueFields({ values, onChange, required = true }: { values: Values; onChange: Change; required?: boolean }) {
  const range = backdateWindow(businessToday());
  const measuredAt = (
    <Field label="Thời điểm đo (giờ Việt Nam) *" type="datetime-local" required={required} min={`${range.min}T00:00`} max={businessTime()} value={values.measuredAt} onChange={(event) => onChange("measuredAt", event.target.value)} />
  );
  const reading = (key: "ph" | "salinity" | "temperature", label: string, unit: string) => (
    <UnitField key={`water-${key}`} label={label} unit={unit} decimals={2} min={WATER_LIMITS[key].min} max={WATER_LIMITS[key].max} required={required} value={values[key]} onChange={(next) => onChange(key, next)} />
  );
  return <>
    {measuredAt}
    {reading("ph", "pH (0–14) *", "pH")}
    {reading("salinity", "Độ mặn (‰, 0–50) *", "‰")}
    {reading("temperature", "Nhiệt độ (°C, 0–45) *", "°C")}
  </>;
}
