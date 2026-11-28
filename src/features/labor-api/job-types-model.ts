import type { z } from "zod";
import { addJob, jobType, rateValues, shiftRateValues } from "./contracts";

export type Job = z.infer<typeof jobType>;
export type Rate = Job["otherRates"][number];
export const IN_USE = 101, DISCONTINUED = 102;
export const statusLabel = (statusId: number) => statusId === IN_USE ? "Đang dùng" : "Ngừng dùng";
export const NO_RATE = "Chưa có đơn giá hiệu lực";
export const NO_SHIFT_RATE = "Chưa có đơn giá ca";
export type ShiftRate = NonNullable<Job["currentShiftRate"]>;
/** Which rate of a job a screen changes: the hourly one or the pay of a shift (3 hours of work). */
export type RateKind = "hourly" | "shift";

/** Every rate point of a job, newest effective date first; the current rate is one of them. */
export function allRates(job: Job): Rate[] {
  const rates = new Map<string, Rate>();
  for (const rate of [...(job.currentRate ? [job.currentRate] : []), ...job.otherRates]) if (!rates.has(rate.effectiveFrom)) rates.set(rate.effectiveFrom, rate);
  return [...rates.values()].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

/** Every shift rate point of a job, newest effective date first; the current one is among them. */
export function allShiftRates(job: Job): ShiftRate[] {
  const rates = new Map<string, ShiftRate>();
  for (const rate of [...(job.currentShiftRate ? [job.currentShiftRate] : []), ...(job.otherShiftRates ?? [])]) if (!rates.has(rate.effectiveFrom)) rates.set(rate.effectiveFrom, rate);
  return [...rates.values()].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

export type RateFieldErrors = { hourlyRate?: string; shiftRate?: string; effectiveFrom?: string; name?: string };
const RATE_MESSAGE = "Đơn giá phải là số nguyên dương, tối đa 999.999.999 đồng/giờ.";
const SHIFT_RATE_MESSAGE = "Đơn giá ca phải là số nguyên dương, tối đa 999.999.999 đồng/ca.";
const DATE_MESSAGE = "Chọn ngày hiệu lực hợp lệ.";
const NAME_MESSAGE = "Nhập tên loại công việc, tối đa 100 ký tự.";

/** Same rules the BFF enforces (rateValues / addJob); the messages tell the user which field to fix. */
export function validateRate(rate: string, date: string) {
  const parsed = rateValues.safeParse({ hourlyRate: rate.trim() === "" ? Number.NaN : Number(rate), effectiveFrom: date });
  if (parsed.success) return { ok: true as const, value: parsed.data };
  const errors: RateFieldErrors = {};
  for (const issue of parsed.error.issues) errors[issue.path[0] === "effectiveFrom" ? "effectiveFrom" : "hourlyRate"] = issue.path[0] === "effectiveFrom" ? DATE_MESSAGE : RATE_MESSAGE;
  return { ok: false as const, errors };
}

/** Same check for the pay of one shift (the BFF's shiftRateValues). */
export function validateShiftRate(rate: string, date: string) {
  const parsed = shiftRateValues.safeParse({ shiftRate: rate.trim() === "" ? Number.NaN : Number(rate), effectiveFrom: date });
  if (parsed.success) return { ok: true as const, value: parsed.data };
  const errors: RateFieldErrors = {};
  for (const issue of parsed.error.issues) errors[issue.path[0] === "effectiveFrom" ? "effectiveFrom" : "shiftRate"] = issue.path[0] === "effectiveFrom" ? DATE_MESSAGE : SHIFT_RATE_MESSAGE;
  return { ok: false as const, errors };
}

export function validateName(name: string) {
  const parsed = addJob.shape.name.safeParse(name);
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: { name: NAME_MESSAGE } satisfies RateFieldErrors };
}

/** The shift rate is optional on a new job type: empty means none yet. */
export function validateNewJob(name: string, rate: string, date: string, shiftRate = "") {
  const nameResult = validateName(name), rateResult = validateRate(rate, date), shiftResult = shiftRate.trim() === "" ? undefined : validateShiftRate(shiftRate, date);
  if (nameResult.ok && rateResult.ok && (!shiftResult || shiftResult.ok)) return { ok: true as const, value: { name: nameResult.value, ...rateResult.value, ...(shiftResult?.ok ? { shiftRate: shiftResult.value.shiftRate } : {}) } };
  return { ok: false as const, errors: { ...(nameResult.ok ? {} : nameResult.errors), ...(rateResult.ok ? {} : rateResult.errors), ...(shiftResult && !shiftResult.ok ? { shiftRate: shiftResult.errors.shiftRate } : {}) } satisfies RateFieldErrors };
}

/** MSG-LABOR-04: a rate point may not change a month whose payroll is already finalized. */
export const FINALIZED_MONTH_CODE = "MSG-LABOR-04";
export const FINALIZED_MONTH_MESSAGE = "Đơn giá này sẽ thay đổi một tháng đã chốt lương. Hãy chọn ngày hiệu lực sau kỳ lương đã chốt.";

/** The backend still checks all finalized-payroll dependencies when these optional facts are absent. */
export function rateDateError(job: Job, date: string, kind: RateKind = "hourly"): string | undefined {
  if ((kind === "shift" ? allShiftRates(job) : allRates(job)).some(rate => rate.effectiveFrom === date)) return "Ngày này đã có phiên bản đơn giá. Chọn ngày hiệu lực khác để tạo phiên bản mới.";
  if (job.finalizedPeriods?.some(period => date <= period.to)) return FINALIZED_MONTH_MESSAGE;
  return undefined;
}
