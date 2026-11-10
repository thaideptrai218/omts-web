import type { z } from "zod";
import { addJob, jobType, rateValues } from "./contracts";

export type Job = z.infer<typeof jobType>;
export type Rate = Job["otherRates"][number];
export const IN_USE = 101, DISCONTINUED = 102;
export const statusLabel = (statusId: number) => statusId === IN_USE ? "Đang dùng" : "Ngừng dùng";
export const NO_RATE = "Chưa có đơn giá hiệu lực";

/** Every rate point of a job, newest effective date first; the current rate is one of them. */
export function allRates(job: Job): Rate[] {
  return [...(job.currentRate ? [job.currentRate] : []), ...job.otherRates].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

export type RateFieldErrors = { hourlyRate?: string; effectiveFrom?: string; name?: string };
const RATE_MESSAGE = "Đơn giá phải là số nguyên dương, tối đa 999.999.999 đồng/giờ.";
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

export function validateName(name: string) {
  const parsed = addJob.shape.name.safeParse(name);
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: { name: NAME_MESSAGE } satisfies RateFieldErrors };
}

export function validateNewJob(name: string, rate: string, date: string) {
  const nameResult = validateName(name), rateResult = validateRate(rate, date);
  if (nameResult.ok && rateResult.ok) return { ok: true as const, value: { name: nameResult.value, ...rateResult.value } };
  return { ok: false as const, errors: { ...(nameResult.ok ? {} : nameResult.errors), ...(rateResult.ok ? {} : rateResult.errors) } satisfies RateFieldErrors };
}

/** MSG-LABOR-04: a rate point may not change a month whose payroll is already finalized. */
export const FINALIZED_MONTH_CODE = "MSG-LABOR-04";
export const FINALIZED_MONTH_MESSAGE = "Đơn giá này sẽ thay đổi một tháng đã chốt lương. Hãy chọn ngày hiệu lực sau kỳ lương đã chốt.";
