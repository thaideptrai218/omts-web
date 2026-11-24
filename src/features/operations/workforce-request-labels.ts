import { formatVietnameseDate } from "@/shared/format/date-only";
import type { z } from "zod";
import type { leaveSchema } from "./new-module-contracts";

export type EmployeeRequest = z.infer<typeof leaveSchema>;

/** The three kinds of request an employee sends: leave, or the time of a forgotten check-in / check-out. */
export const requestTypeLabel: Record<EmployeeRequest["type"], string> = { Leave: "Xin nghỉ", MissedCheckIn: "Bù giờ vào", MissedCheckOut: "Bù giờ ra" };

/** "HH:mm:ss" -> "HH:mm". */
const clock = (value: string | null) => (value ? value.slice(0, 5) : "");

/** What the request asks for: the days of leave, or the day and the time to record. */
export function requestWhat(request: EmployeeRequest): string {
  if (request.type === "Leave") return request.from === request.to ? `Ngày ${formatVietnameseDate(request.from)}` : `Từ ${formatVietnameseDate(request.from)} đến ${formatVietnameseDate(request.to)}`;
  return `Ngày ${formatVietnameseDate(request.from)}, giờ ${request.type === "MissedCheckIn" ? "vào" : "ra"} ${clock(request.requestedTime)}`;
}

/** What approving the request will write, for the confirmation. */
export function approvalEffect(request: EmployeeRequest): string {
  if (request.type === "Leave") return "Chỉ ghi nhận ngày nghỉ, không đổi lương.";
  return `Sẽ ghi giờ ${request.type === "MissedCheckIn" ? "vào" : "ra"} ${clock(request.requestedTime)} ngày ${formatVietnameseDate(request.from)} vào chấm công của ${request.employeeName}.`;
}

export function requestStatus(request: EmployeeRequest) {
  if (request.cancelledAt) return "Đã hủy";
  if (request.approved === null) return "Chờ duyệt";
  return request.approved ? "Đã duyệt" : "Từ chối";
}
export const isPending = (request: EmployeeRequest) => request.approved === null && !request.cancelledAt;
