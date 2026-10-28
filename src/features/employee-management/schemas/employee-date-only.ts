import { z } from "zod";

export const employeeDateOnlySchema = z.iso.date().refine((value) => !value.startsWith("0000-"));
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// Matches backend BusinessClock: Vietnam's business date uses UTC+7.
export function employeeBusinessDate(instant: Date): string {
  return new Date(instant.getTime() + VIETNAM_UTC_OFFSET_MS).toISOString().slice(0, 10);
}
