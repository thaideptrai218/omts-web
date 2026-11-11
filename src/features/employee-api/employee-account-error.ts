import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";

/** Only trusted codes reach the UI; backend text may contain submitted values. */
export function employeeAccountError(result: Exclude<WorkspaceResult<unknown>, { status: "success" }>): string {
  if (result.uncertain) return "Chưa xác định được kết quả cấp tài khoản. Đóng hộp thoại và tải lại hồ sơ để đối chiếu trước khi thực hiện tiếp.";
  if (result.httpStatus === 403 || result.code === "MSG-GEN-08") return "Chỉ Chủ hợp tác xã được cấp tài khoản đăng nhập.";
  if (result.httpStatus === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (result.httpStatus === 404) return "Không tìm thấy hồ sơ nhân viên. Hãy tải lại danh sách.";
  if (["MSG-ACCOUNT-09", "MSG03"].includes(result.code ?? "")) return "Tên tài khoản hoặc số điện thoại đã được sử dụng. Vui lòng kiểm tra lại.";
  if (["MSG-GEN-01", "MSG01"].includes(result.code ?? "")) return "Kiểm tra tên tài khoản và số điện thoại trong hồ sơ. Nhân viên phải có số điện thoại hợp lệ, chưa có tài khoản và đang làm việc.";
  if (["MSG-GEN-09", "MSG06", "MSG-GEN-06", "MSG24"].includes(result.code ?? "")) return "Hồ sơ đã thay đổi, đã có tài khoản hoặc đã nghỉ việc. Đóng hộp thoại và tải lại hồ sơ để kiểm tra.";
  return "Chưa thể cấp tài khoản. Vui lòng kiểm tra lại thông tin và kết nối.";
}
