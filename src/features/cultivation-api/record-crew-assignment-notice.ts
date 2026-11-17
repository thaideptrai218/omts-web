import type { CrewAssignmentResult } from "./record-crew-contracts";

const skipText: Record<string, string> = {
  PastDate: "ghi bù ngày cũ nên không tạo phân công",
  AlreadyAssigned: "đã được phân công chỗ khác hôm nay",
  NoPermission: "bạn không có quyền phân công ở vùng này",
  JobTypeNotInUse: "loại việc chưa được dùng",
  Left: "đã nghỉ việc",
  Failed: "không tạo được phân công",
};

/** One sentence about the automatic work assignment of a saved record, or undefined when nothing was added. */
export function crewAssignmentNotice(result: CrewAssignmentResult): string | undefined {
  if (!result || (!result.created && !result.skipped.length)) return undefined;
  const parts: string[] = [];
  if (result.created) parts.push(`Đã tạo phân công cho ${result.created} nhân viên.`);
  const reasons = [...new Set(result.skipped.map(item => skipText[item.reason] ?? "không tạo được phân công"))];
  if (result.skipped.length) parts.push(`Chưa tạo phân công cho ${result.skipped.length} nhân viên (${reasons.join("; ")}). Chấm công vẫn làm thủ công.`);
  else parts.push("Chấm công vẫn làm thủ công.");
  return parts.join(" ");
}
