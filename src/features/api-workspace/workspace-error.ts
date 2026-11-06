import type { WorkspaceResult } from "./workspace-repository";
import { formatMessage } from "@/shared/messages/message-catalog";
import { isSrsMessageCode } from "@/shared/messages/backend-message-code";
export function workspaceError(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>) {
  if (result.httpStatus === 401) return result.uncertain ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại và đối chiếu dữ liệu trước khi thực hiện lượt mới." : "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  if (result.httpStatus === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (isSrsMessageCode(result.code)) return formatMessage({ code: result.code });
  if (result.code === "MSG06") return "Bản ghi đã thay đổi. Hãy tải dữ liệu mới để đối chiếu; bản nháp của bạn vẫn được giữ.";
  if (result.code === "MSG03") return "Thông tin này đã tồn tại. Hãy kiểm tra bản ghi hiện có.";
  if (result.code === "MSG11") return "Bản ghi đang được sử dụng nên chưa thể đổi trạng thái.";
  if (result.code === "MSG01" || result.httpStatus === 400) return "Vui lòng kiểm tra lại thông tin đã nhập.";
  if (result.uncertain) return "Chưa xác nhận được kết quả. Hãy tải lại dữ liệu để đối chiếu trước khi thực hiện tiếp.";
  if (result.httpStatus === 404) return "Không tìm thấy hồ sơ trên hệ thống. Hãy tải lại danh sách để đối chiếu.";
  if (result.httpStatus === 409) return "Dữ liệu đã thay đổi. Hãy tải lại để đối chiếu trước khi thao tác tiếp.";
  if (result.httpStatus === 502) return "Dữ liệu API trả về chưa khớp phiên bản Web. Hãy báo nhóm kỹ thuật kiểm tra contract.";
  if (result.httpStatus >= 500 || result.httpStatus === 0) return "Chưa kết nối được dịch vụ. Hãy kiểm tra backend và thử tải lại.";
  return "Chưa thể thực hiện thao tác. Hãy kiểm tra dữ liệu rồi thử lại.";
}
