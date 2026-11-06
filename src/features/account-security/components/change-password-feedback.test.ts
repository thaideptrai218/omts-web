import { describe, expect, it } from "vitest";
import { getChangePasswordFeedback } from "@/features/account-security/components/change-password-feedback";

describe("change password feedback", () => {
  it("maps an invalid current password to the current-password field", () => {
    expect(
      getChangePasswordFeedback({
        message: { code: "MSG17" },
        reason: "invalid-current-password",
        status: "rejected",
      }),
    ).toEqual({
      field: "currentPassword",
      kind: "field-error",
      message: "Mật khẩu hiện tại không đúng. Mật khẩu của bạn chưa được thay đổi.",
    });
  });

  it("maps a rejected new password to the new-password field", () => {
    expect(
      getChangePasswordFeedback({
        message: { code: "MSG01" },
        reason: "invalid-new-password",
        status: "rejected",
      }),
    ).toEqual({
      field: "newPassword",
      kind: "field-error",
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
    });
  });

  it("keeps session expiry and success as flow-level feedback", () => {
    expect(
      getChangePasswordFeedback({
        message: { code: "MSG19" },
        reason: "session-expired",
        status: "rejected",
      }),
    ).toEqual({ kind: "session-expired", message: { code: "MSG19" } });

    expect(
      getChangePasswordFeedback({
        message: { code: "MSG18" },
        status: "changed",
      }),
    ).toEqual({ kind: "changed", message: { code: "MSG18" } });
  });
});
