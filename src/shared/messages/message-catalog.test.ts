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

const profileMessages = [
  ["MSG10", "Hồ sơ cá nhân đã được lưu."],
  [
    "MSG20",
    "Bạn không thể tự thay đổi tên đăng nhập. Vui lòng liên hệ Chủ hợp tác xã hoặc kênh hỗ trợ.",
  ],
  [
    "MSG62",
    "Mã xác minh đã được gửi tới d***@omts.test. Hãy nhập mã để hoàn tất; email cũ vẫn được sử dụng cho đến khi xác minh thành công.",
  ],
] as const satisfies readonly (readonly [MessageCode, string])[];

const notificationPreferenceMessages = [
  [
    "MSG21",
    "Kênh Email chưa được cấu hình hoặc chưa đủ điều kiện nên chưa thể bật.",
  ],
  [
    "MSG22",
    "Thiết bị đã từ chối nhận thông báo đẩy. Các kênh hợp lệ khác vẫn được lưu.",
  ],
  ["MSG23", "Loại thông báo này là bắt buộc và không thể tắt."],
] as const satisfies readonly (readonly [MessageCode, string])[];

const cooperativeProvisioningMessages = [
  [
    "MSG03",
    "Hợp tác xã đã tồn tại. Hệ thống không tạo bản sao; hãy kiểm tra bản ghi hiện có.",
  ],
  [
    "MSG55",
    "Danh tính chưa được xác minh nên hệ thống không thực hiện thao tác này.",
  ],
] as const satisfies readonly (readonly [MessageCode, string])[];

const cooperativeProfileMessages = [
  ["MSG02", "Bạn không có quyền thực hiện thao tác này."],
  ["MSG10", "Hồ sơ hợp tác xã đã được lưu."],
] as const satisfies readonly (readonly [MessageCode, string])[];

const roleManagementMessages = [
  [
    "MSG09",
    "Bạn có chắc muốn cập nhật vai trò? Thao tác này sẽ được ghi vào lịch sử hệ thống.",
  ],
  [
    "MSG11",
    "Không thể tiếp tục vì còn 2 bản ghi đang sử dụng: Nguyễn An, Trần Bình. Vui lòng xử lý các bản ghi này trước.",
  ],
] as const satisfies readonly (readonly [MessageCode, string])[];

const employeeManagementMessages = [
  ["MSG10", "Hồ sơ nhân viên đã được lưu."],
  [
    "MSG24",
    "Tài khoản này đã được liên kết với hồ sơ nhân viên Nguyễn Văn An.",
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

describe("profile message catalog", () => {
  it.each(profileMessages)("formats %s", (code, expectedMessage) => {
    const params: Record<string, string> | undefined =
      code === "MSG10"
        ? { object_name: "Hồ sơ cá nhân" }
        : code === "MSG62"
          ? { masked_email: "d***@omts.test" }
          : undefined;

    expect(formatMessage({ code, params })).toBe(expectedMessage);
  });

  it("formats conflict metadata", () => {
    expect(
      formatMessage({
        code: "MSG06",
        params: { time: "10:30", user_name: "Nguyễn An" },
      }),
    ).toContain("Nguyễn An cập nhật lúc 10:30");
  });
});

describe("notification preference message catalog", () => {
  it.each(notificationPreferenceMessages)("formats %s", (code, expectedMessage) => {
    const params = code === "MSG21" ? { channel_name: "Email" } : undefined;

    expect(formatMessage({ code, params })).toBe(expectedMessage);
  });
});

describe("cooperative provisioning message catalog", () => {
  it.each(cooperativeProvisioningMessages)("formats %s", (code, expectedMessage) => {
    const params = code === "MSG03" ? { object_name: "Hợp tác xã" } : undefined;

    expect(formatMessage({ code, params })).toBe(expectedMessage);
  });
});

describe("cooperative profile message catalog", () => {
  it.each(cooperativeProfileMessages)("formats %s", (code, expectedMessage) => {
    const params =
      code === "MSG10" ? { object_name: "Hồ sơ hợp tác xã" } : undefined;

    expect(formatMessage({ code, params })).toBe(expectedMessage);
  });
});

describe("role management message catalog", () => {
  it.each(roleManagementMessages)("formats %s", (code, expectedMessage) => {
    const actualMessage =
      code === "MSG09"
        ? formatMessage({ code, params: { action: "cập nhật vai trò" } })
        : formatMessage({
            code,
            params: { count: 2, related_list: "Nguyễn An, Trần Bình" },
          });

    expect(actualMessage).toBe(expectedMessage);
  });
});

describe("employee management message catalog", () => {
  it.each(employeeManagementMessages)("formats %s", (code, expectedMessage) => {
    const params: Record<string, string> =
      code === "MSG10"
        ? { object_name: "Hồ sơ nhân viên" }
        : { employee_name: "Nguyễn Văn An" };

    expect(formatMessage({ code, params })).toBe(expectedMessage);
  });
});
