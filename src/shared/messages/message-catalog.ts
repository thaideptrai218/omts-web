export const messageCatalog = {
  MSG01: "Vui lòng kiểm tra lại thông tin đã nhập.",
  MSG04: "Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau.",
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
