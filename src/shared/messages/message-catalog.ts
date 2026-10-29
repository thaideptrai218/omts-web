export const messageCatalog = {
  MSG01: "Vui lòng kiểm tra lại thông tin đã nhập.",
  MSG02: "Bạn không có quyền thực hiện thao tác này.",
  MSG03:
    "{object_name} đã tồn tại. Hệ thống không tạo bản sao; hãy kiểm tra bản ghi hiện có.",
  MSG04: "Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau.",
  MSG05: "Chưa thể xử lý tệp. Vui lòng kiểm tra kết quả trước khi thử lại.",
  MSG06:
    "Dữ liệu vừa được {user_name} cập nhật lúc {time}. Thay đổi của bạn chưa được lưu; vui lòng tải dữ liệu mới để kiểm tra.",
  MSG09:
    "Bạn có chắc muốn {action}? Thao tác này sẽ được ghi vào lịch sử hệ thống.",
  MSG10: "{object_name} đã được lưu.",
  MSG11:
    "Không thể tiếp tục vì còn {count} bản ghi đang sử dụng: {related_list}. Vui lòng xử lý các bản ghi này trước.",
  MSG12: "Thông tin đăng nhập không đúng.",
  MSG13:
    "Tài khoản này hiện không thể sử dụng. Vui lòng liên hệ kênh hỗ trợ.",
  MSG14:
    "Không thể đăng ký bằng email hoặc số điện thoại này. Bạn có thể đăng nhập hoặc khôi phục tài khoản.",
  MSG15:
    "Nếu thông tin hợp lệ, mã xác minh sẽ được gửi tới email hoặc số điện thoại bạn vừa nhập.",
  MSG16: "Mã xác minh không đúng hoặc đã hết hạn. Bạn có thể nhập lại hoặc yêu cầu mã mới.",
  MSG17: "Mật khẩu hiện tại không đúng. Mật khẩu của bạn chưa được thay đổi.",
  MSG18: "Mật khẩu của bạn đã được thay đổi.",
  MSG19: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  MSG20:
    "Bạn không thể tự thay đổi tên đăng nhập. Vui lòng liên hệ Chủ hợp tác xã hoặc kênh hỗ trợ.",
  MSG21:
    "Kênh {channel_name} chưa được cấu hình hoặc chưa đủ điều kiện nên chưa thể bật.",
  MSG22:
    "Thiết bị đã từ chối nhận thông báo đẩy. Các kênh hợp lệ khác vẫn được lưu.",
  MSG23: "Loại thông báo này là bắt buộc và không thể tắt.",
  MSG24:
    "Tài khoản này đã được liên kết với hồ sơ nhân viên {employee_name}.",
  MSG28: "Ngưỡng tối thiểu phải nhỏ hơn ngưỡng tối đa.",
  MSG41: "Số tiền phải là bội số của 1.000 đồng.",
  MSG45: "Số tiền hoặc số lượng vượt mức cho phép.",
  MSG55:
    "Danh tính chưa được xác minh nên hệ thống không thực hiện thao tác này.",
  MSG57:
    "Tài liệu cũ tạm thời bị ẩn cho đến khi việc xác minh danh tính hoàn tất.",
  MSG59: "Số lượng phải lớn hơn 0 và đơn giá phải là số nguyên không âm.",
  MSG61:
    "Không thể chuyển nhân viên từ “{current_status}” sang “{new_status}”: hồ sơ đã ở trạng thái này.",
  MSG62:
    "Mã xác minh đã được gửi tới {masked_email}. Hãy nhập mã để hoàn tất; email cũ vẫn được sử dụng cho đến khi xác minh thành công.",
  MSG67:
    "Tài khoản của bạn cần xác minh số điện thoại để tiếp tục sử dụng OMTS. Vui lòng nhập hoặc xác nhận số điện thoại và nhập mã xác minh được gửi qua SMS.",
  MSG68:
    "Mật khẩu tạm thời đã hết hạn. Nhân viên vui lòng liên hệ Chủ hợp tác xã; Chủ hợp tác xã và thương nhân vui lòng liên hệ Quản trị viên hệ thống để được đặt lại.",
  MSG69:
    "Bạn đã vượt quá số lần thử cho phép. Vui lòng thử đăng nhập lại sau 15 phút.",
} as const;

export type MessageCode = keyof typeof messageCatalog;
export type MessageParams = Record<string, number | string>;

export type AppMessage = {
  code: MessageCode;
  params?: MessageParams;
};

const placeholderPattern = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;

export function formatMessage({ code, params = {} }: AppMessage): string {
  return messageCatalog[code].replace(placeholderPattern, (placeholder, key: string) => {
    const value = params[key];
    return value === undefined ? placeholder : String(value);
  });
}
