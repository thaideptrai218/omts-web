import { verificationError } from "@/features/verification-api/verification-panel";

/** Messages shown after the contact-verification step of "Lưu thay đổi". */

/** Success notice; mentions hidden old documents and a required profile reload when relevant. */
export function contactSavedNotice(nameSaved: boolean, result: { oldDocumentsHidden?: boolean; profile?: unknown }) {
  const saved = nameSaved ? "Đã lưu tên hiển thị và thông tin liên hệ." : "Đã lưu thông tin liên hệ.";
  const documents = result.oldDocumentsHidden ? " Chứng từ cũ sẽ hiện sau khi Chủ nhiệm HTX hoàn tất liên kết." : "";
  const reload = !result.profile ? " Hãy tải lại hồ sơ để lấy phiên bản mới trước khi sửa tiếp." : "";
  return `${saved}${documents}${reload}`;
}

/** Failure message; when the name was already saved, says so before the verification error. */
export function contactFailureMessage(nameSaved: boolean, result: Parameters<typeof verificationError>[0]) {
  const namePrefix = nameSaved ? "Tên hiển thị đã được lưu. Phần liên hệ chưa được xác nhận; nháp vẫn được giữ. " : "";
  return `${namePrefix}${verificationError(result)}`;
}

/** Verification error codes that keep the verified contact draft instead of marking it failed. */
export const retryableContactCodes = ["VERIFICATION_BUSY", "VERIFICATION_UNSUPPORTED", "VERIFICATION_SESSION"];
