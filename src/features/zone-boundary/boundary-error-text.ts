import type { FarmingProblem } from "@/features/cultivation-api/farming-problem";
import { formatMessage } from "@/shared/messages/message-catalog";

/** What the boundary and scan routes understand of a refusal; extra keys of the full result are ignored. */
type Failed = { httpStatus: number; code?: string; problem?: FarmingProblem };

/** MSG-GEN-01 names the field the backend refused: say what to fix, in the words of the review table. */
const fieldText: Record<string, string> = {
  Boundary: "Ranh giới chưa hợp lệ: cần từ 1 đến 10 khu, mỗi khu một vòng từ 3 đến 100 điểm góc.",
  "Boundary coordinates": "Có điểm góc nằm ngoài Việt Nam, trùng vị trí hoặc chưa đủ số. Kiểm tra lại X, Y và kinh tuyến trục.",
  "Boundary name": "Tên khu tối đa 100 ký tự.",
  "Boundary corners": "Tên điểm góc tối đa 20 ký tự.",
  Photo: "Ảnh chưa hợp lệ. Chọn một ảnh JPEG hoặc PNG, tối đa 10 MB.",
};

/**
 * Vietnamese sentence for the refusals of the boundary save and the licence-map read; undefined means "use the generic wording of the status".
 * 503 is a full read queue (OCR_BUSY) and 429 more than 20 reads an hour, so both say "try again later" and never "the service is down".
 */
export function boundaryErrorText(result: Failed): string | undefined {
  if (result.code === "OCR_BUSY") return formatMessage({ code: "OCR_BUSY" });
  if (result.httpStatus === 429) return formatMessage({ code: "TOO_MANY_SCANS" });
  const field = result.problem?.field;
  if (field && Object.hasOwn(fieldText, field) && (result.httpStatus === 400 || result.code === "MSG-GEN-01" || result.code === "MSG01")) return fieldText[field];
  if (result.code === "MSG-GEN-09" || result.code === "MSG61") return "Vùng này không còn ở trạng thái đang sử dụng nên chưa đổi được ranh giới. Hãy tải lại hồ sơ để đối chiếu.";
  if (result.code === "MSG06") return "Hồ sơ vùng đã được người khác thay đổi. Hãy tải lại hồ sơ rồi lưu ranh giới lại; ranh giới đang sửa vẫn được giữ.";
  if (result.httpStatus === 404) return "Kết quả đọc ảnh đã hết hạn (chỉ giữ 15 phút) hoặc không còn. Hãy tải ảnh lên lại.";
  return undefined;
}

/** A read the server gave up on (`errorCode` of a Failed scan). */
export function scanFailureText(errorCode: string | null): string {
  if (errorCode === "BAD_RESPONSE") return "Chưa đọc được nội dung ảnh. Hãy chụp rõ hơn các bảng tọa độ góc rồi thử lại.";
  if (errorCode === "NOT_CONFIGURED") return "Máy chủ chưa bật tính năng đọc ảnh sơ đồ. Hãy nhờ nhóm kỹ thuật kiểm tra.";
  return "Chưa đọc được ảnh lúc này vì dịch vụ đọc ảnh chưa phản hồi. Hãy thử lại sau ít phút.";
}
