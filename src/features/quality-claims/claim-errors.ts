/** Phần của kết quả lỗi mà thông báo cần: mã HTTP, mã thông điệp backend (nếu BFF chuyển) và cờ "chưa biết backend đã ghi hay chưa". */
export type ClaimFailure = { httpStatus: number; code?: string; uncertain: boolean };

/**
 * Thông báo lỗi riêng cho từng thao tác ghi. Trả về undefined thì dùng thông báo chung của màn hình (useMutation).
 * Lỗi chưa rõ kết quả (mất mạng, 5xx, hết phiên) luôn dùng câu chung: không được gửi lại khi chưa đối chiếu.
 */
export function submitErrorText(failure: ClaimFailure): string | undefined {
  if (failure.uncertain) return "Chưa xác nhận được báo cáo đã được gửi hay chưa. Hãy xem mục \"Báo cáo của tôi\" để đối chiếu trước khi gửi lại.";
  if (failure.httpStatus === 400 || failure.code === "MSG-GEN-01") return "Cần có mô tả (tối đa 2.000 ký tự) và từ 1 đến 10 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 10 MB.";
  if (failure.httpStatus === 404) return "Không tìm thấy hóa đơn này trong tài khoản của bạn. Hãy mở lại báo cáo từ đúng hóa đơn.";
  if (failure.httpStatus === 409) return "Không thể báo vấn đề cho hóa đơn này: hóa đơn đã hủy, đã có phiếu trả hàng hoặc đang có một báo cáo chờ hợp tác xã phản hồi.";
  if (failure.httpStatus === 403) return "Chỉ tài khoản thương lái mới gửi được báo cáo vấn đề chất lượng.";
  return undefined;
}

/**
 * Lỗi khi Chủ HTX chấp nhận / từ chối. 409 có hai nguyên nhân: khiếu nại đã được phản hồi (MSG-GEN-09, bản ghi đổi trạng thái)
 * hoặc hóa đơn đã hủy / đã có phiếu trả hàng (MSG-CLAIM-03, backend không gửi mã này qua BFF nên 409 không mã được hiểu như vậy).
 */
export function respondErrorText(failure: ClaimFailure, accepting: boolean): string | undefined {
  if (failure.uncertain) return undefined;
  if (failure.code === "MSG06") return "Khiếu nại vừa được thay đổi ở nơi khác. Hãy tải lại chi tiết rồi phản hồi lại.";
  if (failure.httpStatus === 409 && (failure.code === "MSG-GEN-09" || failure.code === "MSG61")) return "Khiếu nại này đã được phản hồi và không thể đổi. Hãy tải lại chi tiết để xem kết quả.";
  if (failure.httpStatus === 409 && accepting) return "Không thể chấp nhận: hóa đơn đã bị hủy hoặc đã có phiếu trả hàng. Bạn vẫn có thể từ chối kèm lý do.";
  if (failure.httpStatus === 400) return accepting ? "Hãy chọn cách xử lý hợp tác xã đề nghị; ghi chú tối đa 1.000 ký tự." : "Cần nhập lý do từ chối (tối đa 1.000 ký tự).";
  if (failure.httpStatus === 403) return "Chỉ Chủ hợp tác xã mới được phản hồi khiếu nại.";
  if (failure.httpStatus === 404) return "Không tìm thấy khiếu nại này. Hãy tải lại danh sách.";
  return undefined;
}
