import type { z } from "zod";
import type { crewMember } from "./record-crew-contracts";

const clock = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const duration = (minutes: number) => `${Math.floor(minutes / 60)} giờ ${String(minutes % 60).padStart(2, "0")} phút`;

/** One line for a crew member: where they stand on the day of the record and, once checked out, the time they worked (check-in to check-out, break not deducted). */
export function crewWorkText(member: Pick<z.infer<typeof crewMember>, "attendance" | "work">): string | undefined {
  const { attendance, work } = member;
  if (attendance === "NotAssigned") return "Chưa có phân công và chấm công trong ngày";
  if (attendance === "NotCheckedIn") return "Đã phân công, chưa điểm danh vào";
  if (attendance === "Working" && work?.checkedInAt) return `Đang làm từ ${clock(work.checkedInAt)}, chưa điểm danh ra về`;
  if (attendance === "Done" && work?.checkedInAt && work.checkedOutAt)
    return `Đã làm ${clock(work.checkedInAt)} - ${clock(work.checkedOutAt)}${work.minutes != null ? ` (${duration(work.minutes)})` : ""}`;
  return undefined;
}
