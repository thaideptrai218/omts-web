export const messageCatalog = {
  MSG01: "Vui lòng kiểm tra lại thông tin đã nhập.",
  MSG04: "Hệ thống đang tạm thời gián đoạn. Vui lòng thử lại sau.",
  MSG12: "Thông tin đăng nhập không đúng.",
  MSG15:
    "Nếu thông tin hợp lệ, mã xác minh sẽ được gửi tới email hoặc số điện thoại bạn vừa nhập.",
  MSG16: "Mã xác minh không đúng hoặc đã hết hạn. Bạn có thể nhập lại hoặc yêu cầu mã mới.",
  MSG19: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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
