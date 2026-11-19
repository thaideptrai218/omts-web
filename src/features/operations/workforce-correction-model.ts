import { businessTime, toApiTime } from "./ui";
import type { z } from "zod";
import { attendanceRoundingMinutes, type attendanceSettingsVersionSchema } from "./new-module-contracts";

type Settings = z.infer<typeof attendanceSettingsVersionSchema>;
const MAX_SHIFT_MINUTES = 18 * 60;
const toMs = (local: string) => Date.parse(toApiTime(local) ?? "");

/** ISO instant of the backend -> the value of a datetime-local input in the business time zone (UTC+7); empty when there is none. */
export const toLocalInput = (instant: string | null) => (instant ? businessTime(instant) : "");
export const toInstant = (local: string) => (local ? toApiTime(local) : null);

/** "7h20" from minutes. */
export const minutesLabel = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;

/** Checks the corrected times; returns the message to show, or undefined when they are acceptable. */
export function correctionProblem(day: string, checkIn: string, checkOut: string, periodStarts: readonly string[]): string | undefined {
  if (checkOut && !checkIn) return "Nhập giờ vào trước khi nhập giờ ra.";
  if (checkIn && !checkIn.startsWith(day)) return "Giờ vào phải nằm trong ngày công đang sửa.";
  if (!checkIn) return undefined;
  const from = toMs(checkIn);
  if (checkOut) {
    const to = toMs(checkOut);
    if (!(to > from)) return "Giờ ra phải sau giờ vào.";
    if (to - from > MAX_SHIFT_MINUTES * 60_000) return "Giờ ra chỉ được muộn hơn giờ vào tối đa 18 giờ (có thể sang ngày hôm sau).";
    if (periodStarts.some((start) => start && (toMs(start) < from || toMs(start) > to))) return "Giờ bắt đầu của mỗi công việc phải nằm giữa giờ vào và giờ ra.";
  }
  return undefined;
}

/**
 * Estimated paid minutes of the corrected day, the way the server counts them: the time between check-in and check-out, minus the part of
 * the break window of the check-in day that falls inside it, rounded down to the rounding unit. The server's figure after saving is the
 * authority; this lets the Owner see the effect before saving.
 */
export function estimatePaidMinutes(checkIn: string, checkOut: string, settings?: Settings): { paid: number; breakMinutes: number } | undefined {
  if (!checkIn || !checkOut) return undefined;
  const from = toMs(checkIn), to = toMs(checkOut);
  if (!(to > from)) return undefined;
  const day = checkIn.slice(0, 10);
  let breakMinutes = 0;
  if (settings?.breakStart && settings.breakEnd) {
    const start = Date.parse(`${day}T${settings.breakStart}+07:00`), end = Date.parse(`${day}T${settings.breakEnd}+07:00`);
    breakMinutes = Math.max(0, Math.round((Math.min(to, end) - Math.max(from, start)) / 60_000));
  }
  const unit = settings ? attendanceRoundingMinutes[settings.roundingUnit] : 0;
  const worked = Math.round((to - from) / 60_000) - breakMinutes;
  return { paid: unit > 0 ? Math.floor(worked / unit) * unit : worked, breakMinutes };
}
