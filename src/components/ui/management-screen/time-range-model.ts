/** Date arithmetic for the time filter. Everything is local calendar time, so a day never slips through UTC conversion. */
export type TimePreset = "today" | "yesterday" | "thisWeek" | "lastWeek" | "last7" | "thisMonth" | "lastMonth" | "last30" | "thisQuarter" | "lastQuarter" | "thisYear" | "lastYear" | "all";
export type TimeRangeValue = { kind: "preset"; preset: TimePreset; from: string; to: string } | { kind: "custom"; from: string; to: string };

export const timePresetGroups: readonly { label: string; presets: readonly (readonly [TimePreset, string])[] }[] = [
  { label: "Theo ngày", presets: [["today", "Hôm nay"], ["yesterday", "Hôm qua"]] },
  { label: "Theo tuần", presets: [["thisWeek", "Tuần này"], ["lastWeek", "Tuần trước"], ["last7", "7 ngày qua"]] },
  { label: "Theo tháng", presets: [["thisMonth", "Tháng này"], ["lastMonth", "Tháng trước"], ["last30", "30 ngày qua"]] },
  { label: "Theo quý", presets: [["thisQuarter", "Quý này"], ["lastQuarter", "Quý trước"]] },
  { label: "Theo năm", presets: [["thisYear", "Năm nay"], ["lastYear", "Năm trước"], ["all", "Toàn thời gian"]] },
];

export const timePresetLabel = (preset: TimePreset) => timePresetGroups.flatMap((group) => group.presets).find(([key]) => key === preset)?.[1] ?? "";

/** yyyy-MM-dd of the local calendar day, the format the list query takes. */
export function toQueryDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromQueryDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const day = (year: number, month: number, date: number) => new Date(year, month, date);

function bounds(preset: Exclude<TimePreset, "all">, now: Date): [Date, Date] {
  const year = now.getFullYear(), month = now.getMonth(), date = now.getDate();
  const today = day(year, month, date);
  const monday = date - ((now.getDay() + 6) % 7);
  const quarterStart = month - (month % 3);
  switch (preset) {
    case "today": return [today, today];
    case "yesterday": return [day(year, month, date - 1), day(year, month, date - 1)];
    case "thisWeek": return [day(year, month, monday), day(year, month, monday + 6)];
    case "lastWeek": return [day(year, month, monday - 7), day(year, month, monday - 1)];
    case "last7": return [day(year, month, date - 6), today];
    case "thisMonth": return [day(year, month, 1), day(year, month + 1, 0)];
    case "lastMonth": return [day(year, month - 1, 1), day(year, month, 0)];
    case "last30": return [day(year, month, date - 29), today];
    case "thisQuarter": return [day(year, quarterStart, 1), day(year, quarterStart + 3, 0)];
    case "lastQuarter": return [day(year, quarterStart - 3, 1), day(year, quarterStart, 0)];
    case "thisYear": return [day(year, 0, 1), day(year, 11, 31)];
    case "lastYear": return [day(year - 1, 0, 1), day(year - 1, 11, 31)];
  }
}

/** A preset with its dates worked out against "now"; "all" has no bounds, so it sends no date to the query. */
export function presetValue(preset: TimePreset, now = new Date()): TimeRangeValue {
  if (preset === "all") return { kind: "preset", preset, from: "", to: "" };
  const [from, to] = bounds(preset, now);
  return { kind: "preset", preset, from: toQueryDate(from), to: toQueryDate(to) };
}

export const allTime: TimeRangeValue = { kind: "preset", preset: "all", from: "", to: "" };
export const isAllTime = (value: TimeRangeValue) => value.kind === "preset" && value.preset === "all";
