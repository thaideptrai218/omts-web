import type { ZoneFailure } from "../domain/farming-zone";

export function zoneFailureText(result: ZoneFailure): string {
  switch (result.status) {
    case "forbidden":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "not-found":
      return "Không tìm thấy hồ sơ. Hãy đóng và tải lại danh sách để kiểm tra.";
    case "duplicate":
      return "Mã vùng đã được sử dụng. Hãy kiểm tra hồ sơ hiện có hoặc nhập mã khác.";
    case "conflict":
      return `Hồ sơ đã được ${result.updatedBy} cập nhật lúc ${result.updatedAt}. Bản nháp vẫn được giữ; hãy tải lại hồ sơ trước khi sửa tiếp.`;
    case "blocked":
      return `Chưa thể ngừng vùng vì còn bè đang sử dụng: ${result.raftCodes.join(", ")}.`;
    case "file-failed":
      return "Không đọc được tệp đính kèm. Hãy chọn lại tệp rồi thử lại.";
    case "replaced":
      return "Giấy tờ này đã có bản thay thế. Hãy mở bản mới nhất để chỉnh sửa hoặc gia hạn.";
    case "invalid":
      return "Thông tin chưa hợp lệ. Hãy kiểm tra các mục được đánh dấu trước khi lưu.";
  }
}
