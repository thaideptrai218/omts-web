const NOT_SET = "chưa đặt";
const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
/** One threshold range: "7,51–8,5", "≥ 7,5" / "≤ 8,5" when only one end is set, "chưa đặt" when none. */
function range(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${number(min)}–${number(max)}`;
  if (min !== null) return `≥ ${number(min)}`;
  if (max !== null) return `≤ ${number(max)}`;
  return NOT_SET;
}

export type WaterThresholds = { phMin: number | null; phMax: number | null; salinityMin: number | null; salinityMax: number | null; temperatureMin: number | null; temperatureMax: number | null };
const withUnit = (text: string, unit: string) => text === NOT_SET ? text : `${text} ${unit}`;
/** The one line above the water table: thresholds in force for the zone. */
export const thresholdsLine = (limits: WaterThresholds) => [
  `pH ${range(limits.phMin, limits.phMax)}`,
  `Độ mặn ${withUnit(range(limits.salinityMin, limits.salinityMax), "‰")}`,
  `Nhiệt độ ${withUnit(range(limits.temperatureMin, limits.temperatureMax), "°C")}`,
].join(" · ");

/** One indicator's threshold range with its unit ("18–32 ‰"); undefined when the zone has none for it. */
export function indicatorRange(limits: WaterThresholds, indicator: "ph" | "salinity" | "temperature"): string | undefined {
  const text = indicator === "ph" ? range(limits.phMin, limits.phMax) : indicator === "salinity" ? withUnit(range(limits.salinityMin, limits.salinityMax), "‰") : withUnit(range(limits.temperatureMin, limits.temperatureMax), "°C");
  return text === NOT_SET ? undefined : text;
}

const key = (indicator: string) => indicator.toLowerCase();
/** Which of the three indicators a measurement has outside its thresholds (the backend names them pH, Salinity, Temperature). */
export function outsideIndicators(valuesOutside: readonly { indicator: string }[]) {
  const names = new Set(valuesOutside.map(item => key(item.indicator)));
  return { ph: names.has("ph"), salinity: names.has("salinity"), temperature: names.has("temperature") };
}
