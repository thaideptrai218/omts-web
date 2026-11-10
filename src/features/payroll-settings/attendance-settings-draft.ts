import { z } from "zod";
import { attendanceRoundingMinutes, attendanceRoundingSchema, attendanceSettingsSchema, saveAttendanceSettingsSchema } from "@/features/operations/new-module-contracts";

export { attendanceSettingsSchema, attendanceSettingsSavedSchema } from "@/features/operations/new-module-contracts";
export type AttendanceSettings = z.infer<typeof attendanceSettingsSchema>;
type Version = AttendanceSettings["current"];
export type Rounding = z.infer<typeof attendanceRoundingSchema>;

/** Bản nháp trên màn hình: giờ nghỉ giữ dạng "HH:mm" (ô giờ), làm tròn theo mã backend, ngày áp dụng yyyy-MM-dd. */
export type AttendanceDraft = { breakFrom: string; breakTo: string; rounding: Rounding; effectiveFrom: string };

export const ROUNDING_OPTIONS: ReadonlyArray<{ value: Rounding; label: string }> = [
  { value: "None", label: "Không làm tròn" }, { value: "Minutes15", label: "15 phút" }, { value: "Minutes30", label: "30 phút" }, { value: "Hour1", label: "60 phút" },
];
export const roundingLabel = (unit: Rounding) => ROUNDING_OPTIONS.find((o) => o.value === unit)?.label ?? `${attendanceRoundingMinutes[unit]} phút`;

/** Backend trả "HH:mm:ss"; ô giờ chỉ hiện "HH:mm". */
export const displayClock = (value: string | null) => value === null ? "" : value.length === 8 && value.endsWith(":00") ? value.slice(0, 5) : value;

export const draftOfAttendance = (current: Version, today: string): AttendanceDraft =>
  ({ breakFrom: displayClock(current.breakStart), breakTo: displayClock(current.breakEnd), rounding: current.roundingUnit, effectiveFrom: today });

/** Đã đổi so với bản đang hiệu lực (hoặc đổi ngày áp dụng khỏi mặc định). */
export const isAttendanceDirty = (draft: AttendanceDraft, current: Version, today: string) =>
  draft.breakFrom !== displayClock(current.breakStart) || draft.breakTo !== displayClock(current.breakEnd) || draft.rounding !== current.roundingUnit || draft.effectiveFrom !== today;

/** Lỗi nhập liệu (tiếng Việt): giờ nghỉ phải đủ cặp, giờ kết thúc sau giờ bắt đầu, phải có ngày áp dụng. */
export function attendanceProblem(draft: AttendanceDraft): string | undefined {
  const from = draft.breakFrom.trim(), to = draft.breakTo.trim();
  if (!draft.effectiveFrom) return "Chọn ngày áp dụng.";
  if (!from !== !to) return "Nhập đủ giờ nghỉ từ và đến, hoặc để trống cả hai.";
  if (from && to && from >= to) return "Giờ nghỉ đến phải sau giờ nghỉ từ.";
  return undefined;
}

/** Nội dung lưu đã qua hợp đồng chung của backend; undefined khi thiếu rowVersion hoặc nháp sai. */
export function attendancePayload(draft: AttendanceDraft, rowVersion: string) {
  if (attendanceProblem(draft)) return undefined;
  const parsed = saveAttendanceSettingsSchema.safeParse({
    breakStart: draft.breakFrom || null, breakEnd: draft.breakTo || null, roundingUnit: draft.rounding, effectiveFrom: draft.effectiveFrom, rowVersion,
  });
  return parsed.success ? parsed.data : undefined;
}

export const vnDate = (iso: string) => iso.split("-").reverse().join("/");

export function attendanceQuestion(draft: AttendanceDraft): string {
  const rest = draft.breakFrom ? `nghỉ giữa ca ${draft.breakFrom} đến ${draft.breakTo}` : "không trừ giờ nghỉ";
  return `Áp dụng từ ${vnDate(draft.effectiveFrom)}: ${rest}, ${roundingLabel(draft.rounding).toLowerCase()}. Bạn có muốn lưu không?`;
}

/** Các phiên bản đã lưu, mới nhất trước. */
export const sortedVersions = (versions: readonly Version[]) => [...versions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
