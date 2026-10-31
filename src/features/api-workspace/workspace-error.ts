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
  return result.uncertain ? "Chưa xác nhận được kết quả. Hãy tải lại dữ liệu để đối chiếu trước khi thực hiện tiếp."
    : "Chưa thể thực hiện thao tác. Hãy kiểm tra dữ liệu rồi thử lại.";
}
