import { describe, expect, it } from "vitest";
import {
  formatMessage,
  type MessageCode,
} from "@/shared/messages/message-catalog";

const loginMessages = [
  ["MSG13", "Tài khoản này hiện không thể sử dụng. Vui lòng liên hệ kênh hỗ trợ."],
  [
    "MSG67",
    "Tài khoản của bạn cần xác minh số điện thoại để tiếp tục sử dụng OMTS. Vui lòng nhập hoặc xác nhận số điện thoại và nhập mã xác minh được gửi qua SMS.",
  ],
  [
    "MSG68",
    "Mật khẩu tạm thời đã hết hạn. Nhân viên vui lòng liên hệ Chủ hợp tác xã; Chủ hợp tác xã và thương nhân vui lòng liên hệ Quản trị viên hệ thống để được đặt lại.",
  ],
  [
    "MSG69",
    "Bạn đã vượt quá số lần thử cho phép. Vui lòng thử đăng nhập lại sau 15 phút.",
  ],
] as const satisfies readonly (readonly [MessageCode, string])[];

const passwordChangeMessages = [
  [
    "MSG17",
    "Mật khẩu hiện tại không đúng. Mật khẩu của bạn chưa được thay đổi.",
  ],
  ["MSG18", "Mật khẩu của bạn đã được thay đổi."],
] as const satisfies readonly (readonly [MessageCode, string])[];

const registrationMessages = [
  [
    "MSG14",
    "Không thể đăng ký bằng email hoặc số điện thoại này. Bạn có thể đăng nhập hoặc khôi phục tài khoản.",
  ],
] as const satisfies readonly (readonly [MessageCode, string])[];

describe("login message catalog", () => {
  it.each(loginMessages)("formats %s", (code, expectedMessage) => {
    expect(formatMessage({ code })).toBe(expectedMessage);
  });
});

describe("password change message catalog", () => {
  it.each(passwordChangeMessages)("formats %s", (code, expectedMessage) => {
    expect(formatMessage({ code })).toBe(expectedMessage);
  });
});

describe("registration message catalog", () => {
  it.each(registrationMessages)("formats %s", (code, expectedMessage) => {
    expect(formatMessage({ code })).toBe(expectedMessage);
  });
});
